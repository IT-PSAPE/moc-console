import type { MemberType } from "@moc/notifications"
import type { Role, User } from "@moc/types/requests/assignee"
import type { MocTransport } from "./transport"

export type UserWithRole = User & {
  workspaceIds: string[]
  role: Role | null
  memberTypeId: string
}

export type PendingWorkspaceUser = User & {
  requestId: string
  requestedAt: string
}

export type UserProfileUpdate = {
  name?: string
  surname?: string
  avatarUrl?: string | null
  currentDuty?: string | null
  statusMessage?: string | null
}

export function createUsersClient(transport: MocTransport) {
  return {
    getProfile: () => transport.call<User | null>("users", "getProfile"),
    all: (workspaceId: string) => transport.call<User[]>("users", "all", undefined, workspaceId),
    withRoles: (workspaceId: string) => transport.call<UserWithRole[]>("users", "withRoles", undefined, workspaceId),
    pending: (workspaceId: string) => transport.call<PendingWorkspaceUser[]>("users", "pending", undefined, workspaceId),
    availableRoles: () => transport.call<Role[]>("users", "availableRoles"),
    updateProfile: (updates: UserProfileUpdate) => transport.call<void>("users", "updateProfile", updates),
    assignRole: (workspaceId: string, userId: string, roleId: string) =>
      transport.call<void>("users", "assignRole", { userId, roleId }, workspaceId),
    approveJoinRequest: (requestId: string, workspaceId: string) => transport.call<void>("users", "approveJoinRequest", { requestId }, workspaceId),
    rejectJoinRequest: (requestId: string, workspaceId: string) => transport.call<void>("users", "rejectJoinRequest", { requestId }, workspaceId),
    createTelegramLinkToken: () => transport.call<{ token: string }>("users", "createTelegramLinkToken"),
    unlinkTelegram: () => transport.call<void>("users", "unlinkTelegram"),
    requestAssignees: (requestId: string, workspaceId: string) =>
      transport.call<Array<User & { duty: string }>>("users", "requestAssignees", { requestId }, workspaceId),
    checklistAssignees: (checklistId: string, workspaceId: string) =>
      transport.call<Record<string, User[]>>("users", "checklistAssignees", { checklistId }, workspaceId),
    memberTypes: (workspaceId: string) => transport.call<MemberType[]>("users", "memberTypes", undefined, workspaceId),
    saveMemberType: (workspaceId: string, name: string, id: string | null) =>
      transport.call<void>("users", "saveMemberType", { name, id }, workspaceId),
    assignMemberType: (workspaceId: string, userId: string, typeId: string) =>
      transport.call<void>("users", "assignMemberType", { userId, typeId }, workspaceId),
  }
}
