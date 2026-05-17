import type { PlaylistStatus } from "./broadcast-status"
import type { PlaybackMode } from "./playback-mode"
import type { PlaylistTransition } from "./transition"
import type { Cue } from "./cue"
import type { PlaylistLane } from "./lane"

export type VideoSettings = {
  autoplay: boolean
  loop: boolean
  muted: boolean
}

export type Playlist = {
  id: string
  name: string
  description: string
  status: PlaylistStatus
  createdAt: string
  /**
   * Parallel lanes (ADR-0004). Lane order = visual z-stack.
   * Single-lane playlists are the degenerate (pre-multi-track) case.
   */
  lanes: PlaylistLane[]
  /**
   * All lanes' cues flattened in lane→order sequence. Derived, kept for
   * back-compat with single-lane consumers; lanes is the source of truth.
   */
  cues: Cue[]
  backgroundMusicId?: string | null
  backgroundMusicUrl: string | null
  backgroundMusicName: string | null
  defaultImageDuration: number // seconds
  videoSettings: VideoSettings
  thumbnailUrl: string | null
  playbackMode: PlaybackMode
  nextPlaylistId: string | null
  transition: PlaylistTransition
  transitionDurationMs: number
}
