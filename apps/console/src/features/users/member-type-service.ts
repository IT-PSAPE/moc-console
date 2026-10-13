import { moc } from "@/lib/moc-client"
import type { MemberType } from "@moc/notifications"

export function fetchMemberTypes(workspaceId: string): Promise<MemberType[]> {
  return moc.users.memberTypes(workspaceId)
}

export function saveMemberType(workspaceId: string, name: string, id: string | null): Promise<void> {
  return moc.users.saveMemberType(workspaceId, name, id)
}

export async function saveMemberTypeAndFetch(workspaceId: string, name: string, id: string | null): Promise<{ types: MemberType[]; savedType: MemberType }> {
  await saveMemberType(workspaceId, name, id)
  const types = await fetchMemberTypes(workspaceId)
  const savedType = types.find(type => type.id === id) ?? types.find(type => type.name.toLowerCase() === name.toLowerCase())
  if (!savedType) throw new Error('The member type was saved but could not be loaded')
  return { types, savedType }
}

export function assignMemberType(workspaceId: string, userId: string, typeId: string): Promise<void> {
  return moc.users.assignMemberType(workspaceId, userId, typeId)
}
