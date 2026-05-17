import { useCallback, useMemo } from "react"
import type { TimelineLaneData } from "@moc/ui/components/timeline"
import { usePlaylistClock, type ResolvedLane } from "@moc/player"
import type { Cue, MediaItem, PlaylistLane, ResolvedCue } from "@moc/types/broadcast"
import { resolveLaneTimeline, laneDurationSec, MIN_CLIP_SEC } from "@moc/types/broadcast"

const EPS = 1e-3
const round2 = (n: number) => Math.round(n * 100) / 100
const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi)

type UsePlaylistTimelineArgs = {
    lanes: PlaylistLane[]
    mediaItems: MediaItem[]
    defaultImageDuration: number
    onChange: (lanes: PlaylistLane[]) => void
}

// Derives the domain-agnostic Timeline inputs (primitive lanes, time axis,
// transport, persist port) from the playlist model. Lifted out of the view
// so the <Timeline> provider can sit above the command bar — see ADR-0003.
export function usePlaylistTimeline({ lanes, mediaItems, defaultImageDuration, onChange }: UsePlaylistTimelineArgs) {
    const thumbById = useMemo(() => {
        const map = new Map<string, string | null>()
        for (const m of mediaItems) map.set(m.id, m.thumbnail ?? null)
        return map
    }, [mediaItems])

    // Real source URL per media id so the program monitor can render the
    // actual video/image/audio (thumbnails are not generated on upload).
    const urlById = useMemo(() => {
        const map = new Map<string, string>()
        for (const m of mediaItems) map.set(m.id, m.url)
        return map
    }, [mediaItems])

    const durationOf = useCallback(
        (cue: Cue) => mediaItems.find((m) => m.id === cue.mediaItemId)?.duration ?? null,
        [mediaItems],
    )

    const resolvedLanes = useMemo(
        () => lanes.map((lane) => ({ lane, resolved: resolveLaneTimeline(lane, defaultImageDuration, durationOf) })),
        [lanes, defaultImageDuration, durationOf],
    )

    // Canvas ruler width (>= 1 min for a usable empty grid).
    const total = useMemo(
        () => Math.max(60, ...resolvedLanes.map(({ resolved }) => laneDurationSec(resolved))),
        [resolvedLanes],
    )

    // The same resolved data shaped for the shared @moc/player compositor,
    // and the real playlist length the master clock loops at (longest lane;
    // not the padded ruler width). One resolution feeds both canvas + preview.
    const programLanes = useMemo<ResolvedLane[]>(
        () => [...resolvedLanes]
            .sort((a, b) => a.lane.order - b.lane.order)
            .map(({ lane, resolved }) => ({
                id: lane.id,
                type: lane.type,
                order: lane.order,
                name: lane.name,
                resolved,
                lengthSec: laneDurationSec(resolved),
            }))
            .filter((l) => l.resolved.length > 0),
        [resolvedLanes],
    )

    const programTotal = useMemo(
        () => Math.max(0, ...programLanes.map((l) => l.lengthSec)),
        [programLanes],
    )

    const primitiveLanes = useMemo<TimelineLaneData[]>(
        () => resolvedLanes.map(({ lane, resolved }) => ({
            id: lane.id,
            type: lane.type,
            data: { name: lane.name, type: lane.type },
            blocks: resolved.map((c) => ({ id: c.id, start: c.startSec, duration: Math.max(1, c.durationSec), data: c as Cue })),
        })),
        [resolvedLanes],
    )

    // Authoritative master clock (ADR-0005) — seconds, loops at the real
    // playlist length. Implements TimelineTransport so it drops straight
    // into the domain-agnostic Timeline primitive's injected port.
    const transport = usePlaylistClock({ duration: programTotal, atEnd: "loop" })

    // Translate a committed timeline block back into cue state. The generic
    // primitive only ever reports new {start,duration}; it never learns the
    // domain (ADR-0003). We recover the user's *intent* from the geometry
    // delta — the primitive produces exactly three shapes:
    //   • duration unchanged, start moved      → move (reposition only)
    //   • start fixed, duration changed        → trim the tail (out-point)
    //   • end fixed, start+duration changed    → trim the head (in-point)
    // For video/audio that maps onto in/out points into the real source
    // (non-destructive). For images there is no source, so it's just a free
    // position + display-length change. startSec is always persisted so
    // deliberate gaps survive (gap = black on the public screen).
    const reconcileCue = useCallback((prev: ResolvedCue, start: number, duration: number, laneId: string, order: number): Cue => {
        const base: Cue = { ...prev, laneId, order, startSec: round2(Math.max(0, start)) }
        const prevStart = prev.startSec
        const prevDur = prev.durationSec
        const startMoved = Math.abs(start - prevStart) > EPS
        const durChanged = Math.abs(duration - prevDur) > EPS
        const endFixed = Math.abs((start + duration) - (prevStart + prevDur)) < EPS

        const source = prev.mediaItemType === "image" ? null : durationOf(prev)

        if (source == null) {
            // Image / unmeasured source: the block length IS the display
            // length; in/out have no meaning here.
            if (durChanged) base.durationOverride = Math.max(MIN_CLIP_SEC, Math.round(duration))
            return base
        }

        const prevIn = prev.inPointSec
        const prevOut = prev.outPointSec
        base.durationOverride = null // video length is derived from in/out

        if (!startMoved && !durChanged) return base // pure reorder/no-op
        if (!startMoved && durChanged) {
            // tail trim — push/pull the out-point, keep the in-point
            base.inPoint = round2(prevIn)
            base.outPoint = round2(clamp(prevIn + duration, prevIn + MIN_CLIP_SEC, source))
            return base
        }
        if (endFixed && startMoved) {
            // head trim — slide the in-point into the source, keep the out
            base.inPoint = round2(clamp(prevIn + (start - prevStart), 0, prevOut - MIN_CLIP_SEC))
            base.outPoint = round2(prevOut)
            return base
        }
        // move — reposition on the timeline only; trim window unchanged
        base.inPoint = round2(prevIn)
        base.outPoint = round2(prevOut)
        return base
    }, [durationOf])

    const handleChange = useCallback((next: TimelineLaneData[]) => {
        const rebuilt: PlaylistLane[] = next.map((l, laneIndex) => {
            const ordered = [...l.blocks].sort((a, b) => a.start - b.start)
            return {
                id: l.id,
                order: laneIndex,
                type: (l.type as PlaylistLane["type"]) ?? "visual",
                name: (l.data as { name: string | null } | undefined)?.name ?? null,
                cues: ordered.map((b, i) => reconcileCue(b.data as ResolvedCue, b.start, b.duration, l.id, i + 1)),
            }
        })
        onChange(rebuilt)
    }, [onChange, reconcileCue])

    return { primitiveLanes, total, transport, handleChange, thumbById, urlById, programLanes }
}
