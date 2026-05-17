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
  durationOverride: number | null // seconds; images only — a custom still duration. null = playlist default
  /**
   * Explicit timeline position (seconds) on the lane's axis. null = legacy
   * gapless behaviour (start = cumulative sum of preceding clips). Set once
   * the clip is dragged, which lets clips sit with deliberate gaps between
   * them (gap = black on the public screen — an accepted product choice).
   */
  startSec?: number | null
  /** Video/audio trim: seconds into the SOURCE the clip starts at. */
  inPoint?: number
  /** Video/audio trim: seconds into the SOURCE the clip ends at. null = source end. */
  outPoint?: number | null
  /** Video audio. Defaults to unmuted (videos play their own sound). */
  muted?: boolean
  disabled?: boolean // skip this cue during playout
}
