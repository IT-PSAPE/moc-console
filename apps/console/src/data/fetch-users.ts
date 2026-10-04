import { moc } from "@/lib/moc-client"
import type { UserWithRole, PendingWorkspaceUser, UserProfileUpdate } from "@moc/sdk/users"
import type { Role } from "@moc/types/requests/assignee"
import { uploadUserAvatarStorage } from "./upload-user-avatar"

export type { UserWithRole, PendingWorkspaceUser }

export async function fetchUsersWithRoles(workspaceId: string): Promise<UserWithRole[]> {
  return moc.users.withRoles(workspaceId)
}

export async function fetchPendingWorkspaceUsers(workspaceId: string): Promise<PendingWorkspaceUser[]> {
  return moc.users.pending(workspaceId)
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

export async function approveWorkspaceJoinRequest(requestId: string, workspaceId: string): Promise<void> {
  await moc.users.approveJoinRequest(requestId, workspaceId)
}

export async function rejectWorkspaceJoinRequest(requestId: string, workspaceId: string): Promise<void> {
  await moc.users.rejectJoinRequest(requestId, workspaceId)
}

export async function createTelegramLinkToken(_userId: string): Promise<{ token: string }> {
  void _userId
  return moc.users.createTelegramLinkToken()
}

export async function unlinkTelegram(_userId: string): Promise<void> {
  void _userId
  await moc.users.unlinkTelegram()
}
