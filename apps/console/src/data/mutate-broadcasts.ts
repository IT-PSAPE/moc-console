import { moc } from "@/lib/moc-client"
import { probeMediaFile } from "@moc/utils/probe-media-file"
import type { Broadcast, BroadcastItem, BroadcastKind } from "@moc/types/broadcast/broadcast"
import { BROADCAST_MEDIA_BUCKET } from "@moc/types/broadcast/broadcast-constants"
import { buildBroadcastMutationRows } from "./broadcast-mutation-rows"
import { createBroadcastSlug } from "./broadcast-slug"
import { fetchBroadcastById } from "./fetch-broadcasts"

export type BroadcastUploadStatus = "queued" | "uploading" | "complete" | "error"
export type BroadcastUploadFile = { clientId: string; file: File }
export type BroadcastPlaylistUpdateItem =
  | { id: string; source: "existing" }
  | { clientId: string; file: File; source: "upload" }
export type BroadcastUploadStatusChange = (clientId: string, status: BroadcastUploadStatus, error?: string) => void

export type CreateBroadcastParams = {
  workspaceId: string
  title: string
  description: string
  kind: BroadcastKind
  files: BroadcastUploadFile[]
  onUploadStatusChange?: BroadcastUploadStatusChange
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
}

export type DeleteBroadcastParams = { id: string; workspaceId: string }
export type DeleteBroadcastResult = { storageCleanupError: Error | null }

type UploadedBroadcastItem = {
  clientId: string
  durationSeconds: number | null
  file: File
  publicUrl: string
  storagePath: string
  storageBucket: string
}

function storagePurpose(kind: BroadcastKind): "broadcast-audio" | "broadcast-video" {
  return kind === "audio" ? "broadcast-audio" : "broadcast-video"
}

async function requireDecodableFile(file: File, kind: BroadcastKind): Promise<number | null> {
  const { durationSeconds, isDecodable } = await probeMediaFile(file, kind)
  if (!isDecodable) throw new Error(`"${file.name}" is not a playable ${kind} file and was not uploaded.`)
  return durationSeconds
}

async function removeStoragePaths(paths: string[], kind: BroadcastKind, workspaceId: string): Promise<void> {
  if (paths.length === 0) return
  await moc.storage.remove({ purpose: storagePurpose(kind), workspaceId, paths })
}

async function uploadFiles(params: { files: BroadcastUploadFile[]; kind: BroadcastKind; onStatusChange?: BroadcastUploadStatusChange; workspaceId: string }): Promise<UploadedBroadcastItem[]> {
  const uploadedItems: UploadedBroadcastItem[] = []
  try {
    for (const upload of params.files) {
      params.onStatusChange?.(upload.clientId, "uploading")
      let durationSeconds: number | null
      try {
        durationSeconds = await requireDecodableFile(upload.file, params.kind)
      } catch (error) {
        params.onStatusChange?.(upload.clientId, "error", error instanceof Error ? error.message : "This file is not playable.")
        throw error
      }

      let result: Awaited<ReturnType<typeof moc.storage.upload>>
      try {
        result = await moc.storage.upload({
          purpose: storagePurpose(params.kind),
          workspaceId: params.workspaceId,
          file: upload.file,
        })
      } catch (error) {
        params.onStatusChange?.(upload.clientId, "error", error instanceof Error ? error.message : "The file could not be uploaded.")
        throw error
      }
      uploadedItems.push({
        clientId: upload.clientId,
        durationSeconds,
        file: upload.file,
        publicUrl: result.url,
        storagePath: result.path,
        storageBucket: result.bucket,
      })
      params.onStatusChange?.(upload.clientId, "complete")
    }
    return uploadedItems
  } catch (error) {
    await removeStoragePaths(uploadedItems.map((item) => item.storagePath), params.kind, params.workspaceId).catch(() => undefined)
    throw error
  }
}

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

async function reloadBroadcast(id: string, workspaceId: string): Promise<Broadcast> {
  const broadcast = await fetchBroadcastById(id, workspaceId)
  if (!broadcast) throw new Error("The broadcast was saved but could not be reloaded")
  return broadcast
}

export async function createBroadcast(params: CreateBroadcastParams): Promise<Broadcast> {
  const broadcastId = crypto.randomUUID()
  const slug = createBroadcastSlug(params.title)
  let uploadedItems: UploadedBroadcastItem[] = []
  try {
    uploadedItems = await uploadFiles({ files: params.files, kind: params.kind, onStatusChange: params.onUploadStatusChange, workspaceId: params.workspaceId })
    await moc.broadcasts.create({
      id: broadcastId,
      workspaceId: params.workspaceId,
      title: params.title,
      description: params.description,
      kind: params.kind,
      slug,
      items: buildBroadcastMutationRows(uploadedItems.map(toMutationItem)),
    })
  } catch (error) {
    await removeStoragePaths(uploadedItems.map((item) => item.storagePath), params.kind, params.workspaceId).catch(() => undefined)
    throw error
  }
  return reloadBroadcast(broadcastId, params.workspaceId)
}

export async function updateBroadcast(params: UpdateBroadcastParams): Promise<Broadcast> {
  const retainedIds = new Set(params.items.filter((item) => item.source === "existing").map((item) => item.id))
  const removedItems = params.currentItems.filter((item) => !retainedIds.has(item.id))
  const uploads = params.items.filter((item): item is Extract<BroadcastPlaylistUpdateItem, { source: "upload" }> => item.source === "upload")
  const uploadedItems = await uploadFiles({ files: uploads, kind: params.kind, onStatusChange: params.onUploadStatusChange, workspaceId: params.workspaceId })
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

  try {
    await moc.broadcasts.update({
      id: params.id,
      workspaceId: params.workspaceId,
      expectedUpdatedAt: params.expectedUpdatedAt,
      title: params.title,
      description: params.description,
      kind: params.kind,
      items: buildBroadcastMutationRows(mutationItems),
    })
  } catch (error) {
    await removeStoragePaths(uploadedItems.map((item) => item.storagePath), params.kind, params.workspaceId).catch(() => undefined)
    throw error
  }
  await removeStoragePaths(removedItems.map((item) => item.storagePath), params.kind, params.workspaceId).catch(() => undefined)
  return reloadBroadcast(params.id, params.workspaceId)
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
