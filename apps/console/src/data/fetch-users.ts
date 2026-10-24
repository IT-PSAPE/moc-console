import { moc } from "@/lib/moc-client"
import type { UserWithRole, WorkspaceInvitation, UserProfileUpdate } from "@moc/sdk/users"
import type { Role } from "@moc/types/requests/assignee"
import { uploadUserAvatarStorage } from "./upload-user-avatar"

export type { UserWithRole, WorkspaceInvitation }

export async function fetchUsersWithRoles(workspaceId: string): Promise<UserWithRole[]> {
  return moc.users.withRoles(workspaceId)
}

export async function fetchWorkspaceInvitations(workspaceId: string): Promise<WorkspaceInvitation[]> {
  return moc.users.invitations(workspaceId)
}

export async function inviteWorkspaceEmail(workspaceId: string, email: string): Promise<{ invitation: WorkspaceInvitation; emailSent: boolean }> {
  return moc.users.invite(workspaceId, email)
}

export async function resendWorkspaceInvitation(workspaceId: string, invitationId: string): Promise<{ invitation: WorkspaceInvitation; emailSent: boolean }> {
  return moc.users.resendInvitation(workspaceId, invitationId)
}

export async function revokeWorkspaceInvitation(workspaceId: string, invitationId: string): Promise<void> {
  await moc.users.revokeInvitation(workspaceId, invitationId)
}

export async function fetchAvailableRoles(): Promise<Role[]> {
  return moc.users.availableRoles()
}

export type EditableUserProfileFields = {
  name?: string
  surname?: string
  avatar_url?: string | null
  current_duty?: string | null
  status_message?: string | null
}

function toProfileUpdate(fields: EditableUserProfileFields): UserProfileUpdate {
  return {
    ...(fields.name !== undefined ? { name: fields.name } : {}),
    ...(fields.surname !== undefined ? { surname: fields.surname } : {}),
    ...(fields.avatar_url !== undefined ? { avatarUrl: fields.avatar_url } : {}),
    ...(fields.current_duty !== undefined ? { currentDuty: fields.current_duty } : {}),
    ...(fields.status_message !== undefined ? { statusMessage: fields.status_message } : {}),
  }
}

export async function updateUserProfile(_userId: string, fields: EditableUserProfileFields): Promise<void> {
  void _userId
  await moc.users.updateProfile(toProfileUpdate(fields))
}

/** Upload the avatar through the storage API, then save its URL to the signed-in profile. */
export async function uploadUserAvatar(_userId: string, file: Blob): Promise<string> {
  const { url } = await uploadUserAvatarStorage(file)
  await moc.users.updateProfile({ avatarUrl: url })
  return url
}

export async function removeUserAvatar(_userId: string): Promise<void> {
  void _userId
  await moc.users.updateProfile({ avatarUrl: null })
}

export async function assignUserRole(workspaceId: string, userId: string, roleId: string): Promise<void> {
  await moc.users.assignRole(workspaceId, userId, roleId)
}

export async function createTelegramLinkToken(_userId: string): Promise<{ token: string }> {
  void _userId
  return moc.users.createTelegramLinkToken()
}

export async function unlinkTelegram(_userId: string): Promise<void> {
  void _userId
  await moc.users.unlinkTelegram()
}
