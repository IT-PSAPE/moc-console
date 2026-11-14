import { moc } from "@/lib/moc-client"
import type { Broadcast, BroadcastItem, BroadcastKind } from "@moc/types/broadcast/broadcast"
import { BROADCAST_MEDIA_BUCKET } from "@moc/types/broadcast/broadcast-constants"
import { buildBroadcastMutationRows } from "./broadcast-mutation-rows"
import { createBroadcastSlug } from "./broadcast-slug"
import { removeBroadcastStoragePaths, storagePurpose, uploadBroadcastFiles, type BroadcastUploadFile, type BroadcastUploadStatusChange, type UploadedBroadcastItem } from "./broadcast-upload"
export type { BroadcastUploadStatus, BroadcastUploadFile, BroadcastUploadStatusChange } from "./broadcast-upload"

export type BroadcastPlaylistUpdateItem =
  | { id: string; source: "existing" }
  | { clientId: string; file: File; source: "upload" }

export type CreateBroadcastParams = {
  workspaceId: string
  title: string
  description: string
  kind: BroadcastKind
  files: BroadcastUploadFile[]
  onUploadStatusChange?: BroadcastUploadStatusChange
  signal?: AbortSignal
}

export type UpdateBroadcastParams = {
  id: string
  workspaceId: string
  expectedUpdatedAt: string
  title: string
  description: string
  kind: BroadcastKind
  currentItems: BroadcastItem[]
  items: BroadcastPlaylistUpdateItem[]
  onUploadStatusChange?: BroadcastUploadStatusChange
  signal?: AbortSignal
}

export type DeleteBroadcastParams = { id: string; workspaceId: string }
export type DeleteBroadcastResult = { storageCleanupError: Error | null }

function toMutationItem(item: UploadedBroadcastItem) {
  return {
    title: item.file.name,
    storageBucket: item.storageBucket || BROADCAST_MEDIA_BUCKET,
    storagePath: item.storagePath,
    publicUrl: item.publicUrl,
    mimeType: item.file.type || "application/octet-stream",
    fileSizeBytes: item.file.size,
    durationSeconds: item.durationSeconds,
  }
}

export async function createBroadcast(params: CreateBroadcastParams): Promise<Broadcast> {
  const broadcastId = crypto.randomUUID()
  const slug = createBroadcastSlug(params.title)
  let uploadedItems: UploadedBroadcastItem[] = []
  try {
    uploadedItems = await uploadBroadcastFiles({ files: params.files, kind: params.kind, onStatusChange: params.onUploadStatusChange, workspaceId: params.workspaceId, signal: params.signal })
    params.signal?.throwIfAborted()
    return await moc.broadcasts.create({
      id: broadcastId,
      workspaceId: params.workspaceId,
      title: params.title,
      description: params.description,
      kind: params.kind,
      slug,
      items: buildBroadcastMutationRows(uploadedItems.map(toMutationItem)),
    })
  } catch (error) {
    if (!params.signal?.aborted) await removeBroadcastStoragePaths(uploadedItems.map((item) => item.storagePath), params.kind, params.workspaceId).catch(() => undefined)
    throw error
  }
}

export async function updateBroadcast(params: UpdateBroadcastParams): Promise<Broadcast> {
  const retainedIds = new Set(params.items.filter((item) => item.source === "existing").map((item) => item.id))
  const removedItems = params.currentItems.filter((item) => !retainedIds.has(item.id))
  const uploads = params.items.filter((item): item is Extract<BroadcastPlaylistUpdateItem, { source: "upload" }> => item.source === "upload")
  const uploadedItems = await uploadBroadcastFiles({ files: uploads, kind: params.kind, onStatusChange: params.onUploadStatusChange, workspaceId: params.workspaceId, signal: params.signal })
  params.signal?.throwIfAborted()
  const uploadedByClientId = new Map(uploadedItems.map((item) => [item.clientId, item]))
  const currentById = new Map(params.currentItems.map((item) => [item.id, item]))
  const mutationItems = params.items.flatMap((item) => {
    if (item.source === "upload") {
      const uploaded = uploadedByClientId.get(item.clientId)
      return uploaded ? [toMutationItem(uploaded)] : []
    }
    const existing = currentById.get(item.id)
    return existing ? [{
      createdAt: existing.createdAt,
      durationSeconds: existing.durationSeconds,
      fileSizeBytes: existing.fileSizeBytes,
      id: existing.id,
      mimeType: existing.mimeType,
      publicUrl: existing.publicUrl,
      storageBucket: existing.storageBucket,
      storagePath: existing.storagePath,
      title: existing.title,
    }] : []
  })

  let saved: Broadcast
  try {
    saved = await moc.broadcasts.update({
      id: params.id,
      workspaceId: params.workspaceId,
      expectedUpdatedAt: params.expectedUpdatedAt,
      title: params.title,
      description: params.description,
      kind: params.kind,
      items: buildBroadcastMutationRows(mutationItems),
    })
  } catch (error) {
    if (!params.signal?.aborted) await removeBroadcastStoragePaths(uploadedItems.map((item) => item.storagePath), params.kind, params.workspaceId).catch(() => undefined)
    throw error
  }
  params.signal?.throwIfAborted()
  await removeBroadcastStoragePaths(removedItems.map((item) => item.storagePath), params.kind, params.workspaceId).catch(() => undefined)
  return saved
}

export async function deleteBroadcast(params: DeleteBroadcastParams): Promise<DeleteBroadcastResult> {
  const deleted = await moc.broadcasts.delete(params)
  try {
    await moc.storage.remove({ purpose: storagePurpose(deleted.kind), workspaceId: params.workspaceId, paths: deleted.storagePaths })
    return { storageCleanupError: null }
  } catch (cleanupError) {
    return { storageCleanupError: cleanupError instanceof Error ? cleanupError : new Error("The uploaded broadcast files could not be removed.") }
  }
}
