import { probeMediaFile } from "@moc/utils/probe-media-file"
import { supabase } from "@moc/data/supabase"
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

type UploadedBroadcastItem = {
  clientId: string
  durationSeconds: number | null
  file: File
  publicUrl: string
  storagePath: string
}

function sanitizeFileName(fileName: string): string {
  return fileName.toLowerCase().replace(/[^a-z0-9.]+/g, "-")
}

function createStoragePath(workspaceId: string, userId: string, broadcastId: string, file: File): string {
  return `${workspaceId}/${userId}/${broadcastId}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`
}

async function requireSignedInUser(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()

  if (error) throw new Error(error.message)
  if (!data.user?.id) throw new Error("You must be signed in to manage a broadcast")
  return data.user.id
}

// Last line of defence. The editor already checks every file, but nothing
// unplayable may reach storage — a broadcast whose items cannot decode is the
// one failure a viewer sees as "This media could not be played".
async function requireDecodableFile(file: File, kind: BroadcastKind): Promise<number | null> {
  const { durationSeconds, isDecodable } = await probeMediaFile(file, kind)

  if (!isDecodable) {
    throw new Error(`"${file.name}" is not a playable ${kind} file and was not uploaded.`)
  }

  return durationSeconds
}

async function removeStoragePaths(paths: string[]): Promise<void> {
  if (paths.length === 0) return
  const { error } = await supabase.storage.from(BROADCAST_MEDIA_BUCKET).remove(paths)
  if (error) throw new Error(error.message)
}

async function uploadFiles(params: { broadcastId: string; files: BroadcastUploadFile[]; kind: BroadcastKind; onStatusChange?: BroadcastUploadStatusChange; userId: string; workspaceId: string }): Promise<UploadedBroadcastItem[]> {
  const uploadedItems: UploadedBroadcastItem[] = []

  try {
    for (const upload of params.files) {
      params.onStatusChange?.(upload.clientId, "uploading")

      // Probe before the upload so an unplayable file never reaches storage.
      let durationSeconds: number | null
      try {
        durationSeconds = await requireDecodableFile(upload.file, params.kind)
      } catch (error) {
        const message = error instanceof Error ? error.message : "This file is not playable."
        params.onStatusChange?.(upload.clientId, "error", message)
        throw error
      }

      const storagePath = createStoragePath(params.workspaceId, params.userId, params.broadcastId, upload.file)
      const { error } = await supabase.storage.from(BROADCAST_MEDIA_BUCKET).upload(storagePath, upload.file, { upsert: false })

      if (error) {
        params.onStatusChange?.(upload.clientId, "error", error.message)
        throw new Error(error.message)
      }

      const publicUrl = supabase.storage.from(BROADCAST_MEDIA_BUCKET).getPublicUrl(storagePath).data.publicUrl
      uploadedItems.push({ clientId: upload.clientId, durationSeconds, file: upload.file, publicUrl, storagePath })
      params.onStatusChange?.(upload.clientId, "complete")
    }

    return uploadedItems
  } catch (error) {
    await removeStoragePaths(uploadedItems.map((item) => item.storagePath)).catch(() => undefined)
    throw error
  }
}

function toMutationItem(item: UploadedBroadcastItem) {
  return {
    title: item.file.name,
    storageBucket: BROADCAST_MEDIA_BUCKET,
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
  const userId = await requireSignedInUser()
  const broadcastId = crypto.randomUUID()
  const slug = createBroadcastSlug(params.title)
  let uploadedItems: UploadedBroadcastItem[] = []

  try {
    uploadedItems = await uploadFiles({ broadcastId, files: params.files, kind: params.kind, onStatusChange: params.onUploadStatusChange, userId, workspaceId: params.workspaceId })
    const { error } = await supabase.rpc("create_broadcast_with_items", {
      p_broadcast_id: broadcastId,
      p_description: params.description,
      p_items: buildBroadcastMutationRows(uploadedItems.map(toMutationItem)),
      p_kind: params.kind,
      p_slug: slug,
      p_title: params.title,
      p_workspace_id: params.workspaceId,
    })

    if (error) throw new Error(error.message)
  } catch (error) {
    await removeStoragePaths(uploadedItems.map((item) => item.storagePath)).catch(() => undefined)
    throw error
  }

  return reloadBroadcast(broadcastId, params.workspaceId)
}

export async function updateBroadcast(params: UpdateBroadcastParams): Promise<Broadcast> {
  const userId = await requireSignedInUser()
  const retainedIds = new Set(params.items.filter((item) => item.source === "existing").map((item) => item.id))
  const removedItems = params.currentItems.filter((item) => !retainedIds.has(item.id))
  const uploads = params.items.filter((item): item is Extract<BroadcastPlaylistUpdateItem, { source: "upload" }> => item.source === "upload")
  const uploadedItems = await uploadFiles({ broadcastId: params.id, files: uploads, kind: params.kind, onStatusChange: params.onUploadStatusChange, userId, workspaceId: params.workspaceId })
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
    const { error } = await supabase.rpc("replace_broadcast_playlist", {
      p_broadcast_id: params.id,
      p_description: params.description,
      p_expected_updated_at: params.expectedUpdatedAt,
      p_items: buildBroadcastMutationRows(mutationItems),
      p_title: params.title,
      p_workspace_id: params.workspaceId,
    })

    if (error) throw new Error(error.message)
  } catch (error) {
    await removeStoragePaths(uploadedItems.map((item) => item.storagePath)).catch(() => undefined)
    throw error
  }

  await removeStoragePaths(removedItems.map((item) => item.storagePath)).catch(() => undefined)
  return reloadBroadcast(params.id, params.workspaceId)
}
