import type { PlaylistStatus } from "./broadcast-status"
import type { Cue } from "./cue"

export type Playlist = {
  id: string
  name: string
  description: string
  status: PlaylistStatus
  createdAt: string
  cues: Cue[]
}
