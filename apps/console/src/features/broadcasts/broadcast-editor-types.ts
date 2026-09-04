import type { BroadcastUploadStatus, BroadcastUploadStatusChange } from "@/data/mutate-broadcasts"
import type { BroadcastItem, BroadcastKind } from "@moc/types/broadcast/broadcast"

export type BroadcastEditorExistingItem = {
  key: string
  item: BroadcastItem
  source: "existing"
}

export type BroadcastEditorUploadItem = {
  error?: string
  file: File
  key: string
  source: "upload"
  status: BroadcastUploadStatus
}

export type BroadcastEditorItem = BroadcastEditorExistingItem | BroadcastEditorUploadItem

export type BroadcastEditorErrors = {
  playlist?: string
  title?: string
}

export type BroadcastFormSubmit = {
  description: string
  items: BroadcastEditorItem[]
  kind: BroadcastKind
  onUploadStatusChange: BroadcastUploadStatusChange
  title: string
}
