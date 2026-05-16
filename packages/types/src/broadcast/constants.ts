import type { MediaType } from "./media-type"
import type { PlaylistStatus } from "./broadcast-status"
import type { PlaybackMode } from "./playback-mode"
import type { PlaylistTransition } from "./transition"

// ─── Labels ────────────────────────────────────────────

export const mediaTypeLabel: Record<MediaType, string> = {
  image: "Image",
  audio: "Audio",
  video: "Video",
}

export const playlistStatusLabel: Record<PlaylistStatus, string> = {
  draft: "Draft",
  published: "Published",
}

export const playbackModeLabel: Record<PlaybackMode, string> = {
  loop: "Loop playlist",
  stop: "Stop at end",
  sequence: "Play next playlist",
}

export const playlistTransitionLabel: Record<PlaylistTransition, string> = {
  cut: "Cut",
  fade: "Fade",
  crossfade: "Crossfade",
}

// ─── Colors ────────────────────────────────────────────

export const mediaTypeColor: Record<MediaType, "blue" | "green" | "purple"> = {
  image: "blue",
  audio: "green",
  video: "purple",
}

export const playlistStatusColor: Record<PlaylistStatus, "gray" | "green"> = {
  draft: "gray",
  published: "green",
}
