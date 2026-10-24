import type { MemberType } from "@moc/notifications"
import type { Role, User } from "@moc/types/requests/assignee"
import type { MocTransport } from "./transport"

export type CalendarView = "day" | "week" | "month" | "agenda"
export type UserPreferences = { defaultCalendarView: CalendarView }

export type UserWithRole = User & {
  workspaceIds: string[]
  role: Role | null
  memberTypeId: string
}

export type WorkspaceInvitation = { id: string; email: string; createdAt: string; expiresAt: string }
export type WorkspaceInvitationResult = { invitation: WorkspaceInvitation; emailSent: boolean }

export type UserProfileUpdate = {
  name?: string
  surname?: string
  avatarUrl?: string | null
  currentDuty?: string | null
  statusMessage?: string | null
}

export function createUsersClient(transport: MocTransport) {
  return {
    getPreferences: () => transport.call<UserPreferences>("users", "getPreferences"),
    updatePreferences: (preferences: UserPreferences) => transport.call<void>("users", "updatePreferences", preferences),
    getProfile: () => transport.call<User | null>("users", "getProfile"),
    all: (workspaceId: string) => transport.call<User[]>("users", "all", undefined, workspaceId),
    withRoles: (workspaceId: string) => transport.call<UserWithRole[]>("users", "withRoles", undefined, workspaceId),
    invitations: (workspaceId: string) => transport.call<WorkspaceInvitation[]>("users", "invitations", undefined, workspaceId),
    invite: (workspaceId: string, email: string) => transport.call<WorkspaceInvitationResult>("users", "invite", { email }, workspaceId),
    resendInvitation: (workspaceId: string, invitationId: string) => transport.call<WorkspaceInvitationResult>("users", "resendInvitation", { invitationId }, workspaceId),
    revokeInvitation: (workspaceId: string, invitationId: string) => transport.call<void>("users", "revokeInvitation", { invitationId }, workspaceId),
    availableRoles: () => transport.call<Role[]>("users", "availableRoles"),
    updateProfile: (updates: UserProfileUpdate) => transport.call<void>("users", "updateProfile", updates),
    assignRole: (workspaceId: string, userId: string, roleId: string) =>
      transport.call<void>("users", "assignRole", { userId, roleId }, workspaceId),
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
