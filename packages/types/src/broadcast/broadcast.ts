export type BroadcastKind = "audio" | "video"

export type BroadcastItem = {
  id: string
  broadcastId: string
  title: string
  sortOrder: number
  storageBucket: string
  storagePath: string
  publicUrl: string
  mimeType: string
  fileSizeBytes: number
  durationSeconds: number | null
  createdAt: string
}

export type Broadcast = {
  id: string
  workspaceId: string
  createdBy: string
  title: string
  description: string
  slug: string
  kind: BroadcastKind
  createdAt: string
  updatedAt: string
  items: BroadcastItem[]
}
