import type { MediaType } from "./media-type"

export type Cue = {
  id: string
  mediaItemId: string
  mediaItemName: string
  mediaItemType: MediaType
  /** Owning lane (ADR-0004). Optional for back-compat with pre-phase-30 reads. */
  laneId?: string
  /** Position within its lane (ordering is per-lane, not per-playlist). */
  order: number
  durationOverride: number | null // seconds, null = use media default
  disabled?: boolean // skip this cue during playout
}
