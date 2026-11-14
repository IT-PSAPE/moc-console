export type StorageUploadPurpose = "avatar" | "stream-thumbnail" | "quote-image" | "broadcast-audio" | "broadcast-video"
export type StorageBucket = "avatars" | "media" | "broadcast-media"
export type StorageUploadResult = { bucket: StorageBucket; path: string; url: string; size: number; contentType: string }
export type StorageProgress = { loaded: number; total: number }

export type StorageUploadInput = {
  purpose: StorageUploadPurpose
  workspaceId?: string
  file: Blob
  onProgress?: (progress: StorageProgress) => void
  signal?: AbortSignal
}

export type StorageRemoveInput = {
  purpose: StorageUploadPurpose
  workspaceId?: string
  paths: string[]
}

export type StorageUrlInput = { bucket: StorageBucket; path: string }
