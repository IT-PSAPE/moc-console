import type { BroadcastKind } from "./broadcast"

export const BROADCAST_MEDIA_BUCKET = "broadcast-media"

export const BROADCAST_KIND_LABELS: Record<BroadcastKind, string> = {
  audio: "Audio",
  video: "Video",
}

export const BROADCAST_FILE_ACCEPT: Record<BroadcastKind, string> = {
  audio: "audio/*",
  video: "video/*",
}
