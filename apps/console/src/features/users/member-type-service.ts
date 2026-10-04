import { moc } from "@/lib/moc-client"
import type { MemberType } from "@moc/notifications"

export function fetchMemberTypes(workspaceId: string): Promise<MemberType[]> {
  return moc.users.memberTypes(workspaceId)
}

export function saveMemberType(workspaceId: string, name: string, id: string | null): Promise<void> {
  return moc.users.saveMemberType(workspaceId, name, id)
}

export function assignMemberType(workspaceId: string, userId: string, typeId: string): Promise<void> {
  return moc.users.assignMemberType(workspaceId, userId, typeId)
}
