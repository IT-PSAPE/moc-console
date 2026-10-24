import { assignUserRole, fetchAvailableRoles, fetchUsersWithRoles, fetchWorkspaceInvitations, inviteWorkspaceEmail, resendWorkspaceInvitation, revokeWorkspaceInvitation, updateUserProfile } from "@/data/fetch-users"
import type { UserWithRole, WorkspaceInvitation } from "@/data/fetch-users"
import type { Role } from "@moc/types/requests/assignee"
import { useWorkspace } from "@/lib/workspace-context"
import { useWorkspaceResource } from "@/hooks/use-workspace-resource"
import { useCallback, useMemo } from "react"
import { useMemberTypes } from "./use-member-types"

type UsersSnapshot = { users: UserWithRole[]; invitations: WorkspaceInvitation[]; roles: Role[] }
const emptyUsers: UsersSnapshot = { users: [], invitations: [], roles: [] }
type InvitationResult = { invitation: WorkspaceInvitation; emailSent: boolean }

export type UsersContextValue = {
  state: {
    users: UserWithRole[]
    invitations: WorkspaceInvitation[]
    roles: Role[]
    isLoading: boolean
    isInitialLoading: boolean
    error: Error | null
    memberTypes: ReturnType<typeof useMemberTypes>["state"]
  }
  actions: {
    loadUsers: () => Promise<void>
    retryUsers: () => Promise<void>
    updateProfile: (userId: string, fields: { name?: string; surname?: string }) => Promise<void>
    changeRole: (userId: string, roleId: string) => Promise<void>
    invite: (email: string) => Promise<InvitationResult>
    resendInvitation: (invitationId: string) => Promise<InvitationResult>
    revokeInvitation: (invitationId: string) => Promise<void>
    memberTypes: ReturnType<typeof useMemberTypes>["actions"]
  }
  meta: { memberTypes: ReturnType<typeof useMemberTypes>["meta"] }
}

export function useUsersState(): UsersContextValue {
  const { currentWorkspaceId, refresh, role } = useWorkspace()
  const canManage = role?.can_manage_roles === true
  const fetcher = useCallback(async (workspaceId: string): Promise<UsersSnapshot> => {
    const [users, invitations, roles] = await Promise.all([
      fetchUsersWithRoles(workspaceId),
      canManage ? fetchWorkspaceInvitations(workspaceId) : Promise.resolve([] as WorkspaceInvitation[]),
      fetchAvailableRoles(),
    ])
    return { users, invitations, roles }
  }, [canManage])
  const resource = useWorkspaceResource({ emptyValue: emptyUsers, fetcher, resource: `users:${canManage ? "managed" : "member"}`, workspaceId: currentWorkspaceId })
  const { data, isLoading, isInitialLoading, error, load, updateData } = resource

  const onTypeAssigned = useCallback((userId: string, typeId: string) => {
    updateData((current) => ({ ...current, users: current.users.map((user) => user.id === userId ? { ...user, memberTypeId: typeId } : user) }))
  }, [updateData])
  const memberTypes = useMemberTypes(onTypeAssigned)
  const loadUsers = useCallback(() => load(), [load])
  const retryUsers = useCallback(() => load(true), [load])

  const updateProfile = useCallback(async (userId: string, fields: { name?: string; surname?: string }) => {
    await updateUserProfile(userId, fields)
    updateData((current) => ({ ...current, users: current.users.map((user) => user.id === userId ? { ...user, ...fields } : user) }))
  }, [updateData])

  const changeRole = useCallback(async (userId: string, roleId: string) => {
    if (!currentWorkspaceId) throw new Error("No workspace selected")
    await assignUserRole(currentWorkspaceId, userId, roleId)
    await refresh()
    updateData((current) => {
      const newRole = current.roles.find((item) => item.id === roleId) ?? null
      return { ...current, users: current.users.map((user) => user.id === userId ? { ...user, role: newRole } : user) }
    })
  }, [currentWorkspaceId, refresh, updateData])

  const invite = useCallback(async (email: string) => {
    if (!currentWorkspaceId) throw new Error("No workspace selected")
    const result = await inviteWorkspaceEmail(currentWorkspaceId, email)
    updateData((current) => ({ ...current, invitations: [result.invitation, ...current.invitations.filter((item) => item.id !== result.invitation.id)] }))
    return result
  }, [currentWorkspaceId, updateData])

  const resendInvitation = useCallback(async (invitationId: string) => {
    if (!currentWorkspaceId) throw new Error("No workspace selected")
    const result = await resendWorkspaceInvitation(currentWorkspaceId, invitationId)
    updateData((current) => ({ ...current, invitations: current.invitations.map((item) => item.id === invitationId ? result.invitation : item) }))
    return result
  }, [currentWorkspaceId, updateData])

  const revokeInvitation = useCallback(async (invitationId: string) => {
    if (!currentWorkspaceId) throw new Error("No workspace selected")
    await revokeWorkspaceInvitation(currentWorkspaceId, invitationId)
    updateData((current) => ({ ...current, invitations: current.invitations.filter((item) => item.id !== invitationId) }))
  }, [currentWorkspaceId, updateData])

  return useMemo(() => ({
    state: { users: data.users, invitations: data.invitations, roles: data.roles, isLoading, isInitialLoading, error, memberTypes: memberTypes.state },
    actions: { loadUsers, retryUsers, updateProfile, changeRole, invite, resendInvitation, revokeInvitation, memberTypes: memberTypes.actions },
    meta: { memberTypes: memberTypes.meta },
  }), [data, isLoading, isInitialLoading, error, memberTypes, loadUsers, retryUsers, updateProfile, changeRole, invite, resendInvitation, revokeInvitation])
}
