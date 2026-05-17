import type { Cue } from "./cue"

// A playlist Lane (ADR-0004). Lanes render/play in parallel; lane
// `order` IS the visual z-stack (0 = bottom layer, highest = topmost).
// Each lane stays an ordered Cue sequence — a cue's start is the
// cumulative sum of preceding durations *within its lane* (never stored).
//
// `type` is a domain token the Timeline primitive never interprets
// (ADR-0003). 'visual' lanes composite by stacking; 'audio' lanes mix.
export type LaneType = "visual" | "audio" | "overlay"

export type PlaylistLane = {
  id: string
  order: number
  type: LaneType
  name: string | null
  cues: Cue[]
}

// Where a resolved cue's duration came from. Lets the editor distinguish a
// real measured video length from a guess (probe failed / not yet
// backfilled) so it can badge the latter instead of silently lying.
//   "override"      — explicit per-cue durationOverride
//   "image-default" — still image using the playlist default
//   "media"         — measured intrinsic video/audio duration
//   "fallback"      — video/audio with unknown length; default used as a guess
export type DurationSource = "override" | "image-default" | "media" | "fallback"

// Hard floor for a clip's on-screen length. Trimming/resizing can't take a
// clip below this; keeps a clip from collapsing to an unusable sliver.
export const MIN_CLIP_SEC = 1

// The trim window resolved against a video/audio source (seconds). For
// images inPoint=0 and outPoint=displayDuration (no real source axis).
export type ResolvedTrim = { inPoint: number; outPoint: number }

// Resolve a cue's effective trim window into its source. Pure + shared by
// the editor adapter and the player so both agree on what plays.
export function resolveTrim(
  cue: Cue,
  sourceDuration: number | null,
): ResolvedTrim {
  if (sourceDuration == null || cue.mediaItemType === "image") {
    const len = Math.max(MIN_CLIP_SEC, cue.outPoint ?? 0)
    return { inPoint: 0, outPoint: len }
  }
  const inPoint = Math.min(Math.max(0, cue.inPoint ?? 0), Math.max(0, sourceDuration - MIN_CLIP_SEC))
  const outPoint = Math.min(Math.max(inPoint + MIN_CLIP_SEC, cue.outPoint ?? sourceDuration), sourceDuration)
  return { inPoint, outPoint }
}

// A cue with its computed time window on its lane's axis (seconds), plus
// the trim window resolved into its source (inPointSec/outPointSec).
export type ResolvedCue = Cue & {
  startSec: number
  durationSec: number
  durationSource: DurationSource
  inPointSec: number
  outPointSec: number
}

// Resolve every cue's on-timeline window. A cue's start is its explicit
// `startSec` when set (deliberate gaps allowed — gap = black on the public
// screen), otherwise it appends right after the previous clip (legacy
// gapless behaviour, and the natural position for freshly added clips).
// Within a lane clips may NOT overlap: a clip can never start before the
// previous clip (by order) ends, so an explicit start is floored at the
// running cursor. Gaps survive (start beyond the cursor); overlaps don't.
// Disabled cues collapse to 0 so authoring order stays stable but they
// don't occupy the timeline.
export function resolveLaneTimeline(
  lane: PlaylistLane,
  defaultImageDuration: number,
  durationOf: (cue: Cue) => number | null,
): ResolvedCue[] {
  let cursor = 0
  return [...lane.cues]
    .sort((a, b) => a.order - b.order)
    .map((cue) => {
      const mediaDuration = cue.mediaItemType === "image" ? null : durationOf(cue)
      const trim = resolveTrim(cue, mediaDuration)
      let resolved: number
      let durationSource: DurationSource
      if (cue.mediaItemType === "image") {
        resolved = cue.durationOverride ?? defaultImageDuration
        durationSource = cue.durationOverride != null ? "override" : "image-default"
      } else if (mediaDuration != null) {
        // Video/audio length is its trim window into the real source.
        resolved = trim.outPoint - trim.inPoint
        durationSource = "media"
      } else {
        // Length not measured yet — best-guess so the clip is still usable.
        resolved = cue.durationOverride ?? defaultImageDuration
        durationSource = "fallback"
      }
      const durationSec = cue.disabled ? 0 : Math.max(0, resolved)
      // Floor the explicit start at the cursor: keeps gaps, kills overlap.
      const startSec = Math.max(cue.startSec ?? cursor, cursor)
      cursor = startSec + durationSec
      return { ...cue, startSec, durationSec, durationSource, inPointSec: trim.inPoint, outPointSec: trim.outPoint }
    })
}

// Total seconds a lane occupies (its last cue's end).
export function laneDurationSec(resolved: ResolvedCue[]): number {
  const last = resolved[resolved.length - 1]
  return last ? last.startSec + last.durationSec : 0
}

export type LaneMeta = { id: string; order: number; type: LaneType; name: string | null }

const DEFAULT_LANE_ID = "__default__"

// Group flat cues into ordered lanes from lane metadata. Cues whose
// laneId has no matching lane (pre-phase-30 data) collapse into a single
// synthesized default lane, so single-lane playlists keep working.
export function groupCuesIntoLanes(cues: Cue[], laneMeta: LaneMeta[]): PlaylistLane[] {
  const byId = new Map<string, PlaylistLane>()
  for (const m of laneMeta) {
    byId.set(m.id, { id: m.id, order: m.order, type: m.type, name: m.name, cues: [] })
  }
  for (const cue of cues) {
    const key = cue.laneId && byId.has(cue.laneId) ? cue.laneId : DEFAULT_LANE_ID
    let lane = byId.get(key)
    if (!lane) {
      lane = { id: DEFAULT_LANE_ID, order: byId.size, type: "visual", name: null, cues: [] }
      byId.set(DEFAULT_LANE_ID, lane)
    }
    lane.cues.push(cue)
  }
  return [...byId.values()]
    .filter((l) => l.cues.length > 0 || l.id !== DEFAULT_LANE_ID)
    .sort((a, b) => a.order - b.order)
    .map((l) => ({ ...l, cues: [...l.cues].sort((a, b) => a.order - b.order) }))
}

// All lanes' cues flattened in lane→order sequence (the back-compat view).
export function flattenLanes(lanes: PlaylistLane[]): Cue[] {
  return [...lanes]
    .sort((a, b) => a.order - b.order)
    .flatMap((l) => [...l.cues].sort((a, b) => a.order - b.order))
}
