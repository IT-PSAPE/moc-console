import type { StorageBucket } from "@moc/backend/storage/upload-protocol"

export type StorageReadFacts = {
  bucket: StorageBucket
  ownerUserId: string
  workspaceId: string | null
  viewerUserId: string | null
  sharesProfileWorkspace: boolean
  isWorkspaceMember: boolean
  linkedToBroadcastItem: boolean
}

export function canReadStorageObject(facts: StorageReadFacts): boolean {
  if (facts.bucket !== "avatars" && facts.linkedToBroadcastItem) return true
  if (!facts.viewerUserId) return false
  if (facts.viewerUserId === facts.ownerUserId) return true
  if (facts.bucket === "avatars") return facts.sharesProfileWorkspace
  return Boolean(facts.workspaceId && facts.isWorkspaceMember)
}
