import { formatFileSize } from "@moc/utils/file-constraints"
import type { BroadcastEditorItem } from "./broadcast-editor-types"

const uploadStatusLabels = { complete: "Uploaded", error: "Upload failed", queued: "Ready to upload", uploading: "Uploading…" } as const

export function getBroadcastPlaylistItemTitle(item: BroadcastEditorItem): string {
  return item.source === "existing" ? item.item.title : item.file.name
}

export function getBroadcastPlaylistItemSize(item: BroadcastEditorItem): string {
  return formatFileSize(item.source === "existing" ? item.item.fileSizeBytes : item.file.size)
}

export function getBroadcastPlaylistItemStatus(item: BroadcastEditorItem): string | null {
  if (item.source === "existing") return null
  return item.error ?? uploadStatusLabels[item.status]
}
