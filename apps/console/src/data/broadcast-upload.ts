import { moc } from "@/lib/moc-client"
import { probeMediaFile } from "@moc/utils/probe-media-file"
import type { BroadcastKind } from "@moc/types/broadcast/broadcast"

export type BroadcastUploadStatus = "queued" | "uploading" | "complete" | "error"
export type BroadcastUploadFile = { clientId: string; file: File }
export type BroadcastUploadStatusChange = (clientId: string, status: BroadcastUploadStatus, error?: string) => void
export type UploadedBroadcastItem = {
  clientId: string
  durationSeconds: number | null
  file: File
  publicUrl: string
  storagePath: string
  storageBucket: string
}

export function storagePurpose(kind: BroadcastKind): "broadcast-audio" | "broadcast-video" {
  return kind === "audio" ? "broadcast-audio" : "broadcast-video"
}

async function requireDecodableFile(file: File, kind: BroadcastKind): Promise<number | null> {
  const { durationSeconds, isDecodable } = await probeMediaFile(file, kind)
  if (!isDecodable) throw new Error(`"${file.name}" is not a playable ${kind} file and was not uploaded.`)
  return durationSeconds
}

export async function removeBroadcastStoragePaths(paths: string[], kind: BroadcastKind, workspaceId: string): Promise<void> {
  if (paths.length === 0) return
  await moc.storage.remove({ purpose: storagePurpose(kind), workspaceId, paths })
}

export async function uploadBroadcastFiles(params: { files: BroadcastUploadFile[]; kind: BroadcastKind; onStatusChange?: BroadcastUploadStatusChange; workspaceId: string; signal?: AbortSignal }): Promise<UploadedBroadcastItem[]> {
  const uploadedItems: UploadedBroadcastItem[] = []
  try {
    for (const upload of params.files) {
      params.signal?.throwIfAborted()
      params.onStatusChange?.(upload.clientId, "uploading")
      let durationSeconds: number | null
      try {
        durationSeconds = await requireDecodableFile(upload.file, params.kind)
        params.signal?.throwIfAborted()
      } catch (error) {
        if (!params.signal?.aborted) params.onStatusChange?.(upload.clientId, "error", error instanceof Error ? error.message : "This file is not playable.")
        throw error
      }
      let result: Awaited<ReturnType<typeof moc.storage.upload>>
      try {
        result = await moc.storage.upload({ purpose: storagePurpose(params.kind), workspaceId: params.workspaceId, file: upload.file, signal: params.signal })
        params.signal?.throwIfAborted()
      } catch (error) {
        if (!params.signal?.aborted) params.onStatusChange?.(upload.clientId, "error", error instanceof Error ? error.message : "The file could not be uploaded.")
        throw error
      }
      uploadedItems.push({ clientId: upload.clientId, durationSeconds, file: upload.file, publicUrl: result.url, storagePath: result.path, storageBucket: result.bucket })
      params.onStatusChange?.(upload.clientId, "complete")
    }
    return uploadedItems
  } catch (error) {
    if (!params.signal?.aborted) await removeBroadcastStoragePaths(uploadedItems.map((item) => item.storagePath), params.kind, params.workspaceId).catch(() => undefined)
    throw error
  }
}
