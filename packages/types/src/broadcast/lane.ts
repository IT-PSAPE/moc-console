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

// A cue with its computed time window on its lane's axis (seconds).
export type ResolvedCue = Cue & { startSec: number; durationSec: number }

// Compute each cue's start/duration (seconds) from cumulative durations
// within the lane. Disabled cues keep their slot collapsed (0 duration)
// so authoring order is stable but they don't occupy the timeline.
export function resolveLaneTimeline(
  lane: PlaylistLane,
  defaultImageDuration: number,
  durationOf: (cue: Cue) => number | null,
): ResolvedCue[] {
  let cursor = 0
  return [...lane.cues]
    .sort((a, b) => a.order - b.order)
    .map((cue) => {
      const resolved =
        cue.durationOverride ??
        (cue.mediaItemType === "image" ? defaultImageDuration : durationOf(cue)) ??
        defaultImageDuration
      const durationSec = cue.disabled ? 0 : Math.max(0, resolved)
      const startSec = cursor
      cursor += durationSec
      return { ...cue, startSec, durationSec }
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
