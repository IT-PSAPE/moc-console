import type { MediaType } from "./media-type"
import type { PlaylistStatus } from "./broadcast-status"

// ─── Labels ────────────────────────────────────────────

export const mediaTypeLabel: Record<MediaType, string> = {
  image: "Image",
  audio: "Audio",
  video: "Video",
  slide: "Slide",
}

export const playlistStatusLabel: Record<PlaylistStatus, string> = {
  draft: "Draft",
  published: "Published",
}

// ─── Colors ────────────────────────────────────────────

export const mediaTypeColor: Record<MediaType, "blue" | "green" | "purple" | "yellow"> = {
  image: "blue",
  audio: "green",
  video: "purple",
  slide: "yellow",
}

export const playlistStatusColor: Record<PlaylistStatus, "gray" | "green"> = {
  draft: "gray",
  published: "green",
}
