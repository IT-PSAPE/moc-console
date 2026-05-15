import type { PlaylistStatus } from "./broadcast-status"
import type { Cue } from "./cue"

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
  cues: Cue[]
  backgroundMusicId?: string | null
  backgroundMusicUrl: string | null
  backgroundMusicName: string | null
  defaultImageDuration: number // seconds
  videoSettings: VideoSettings
}
