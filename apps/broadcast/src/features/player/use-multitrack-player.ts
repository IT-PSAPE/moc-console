import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ResolvedCue } from '@moc/types/broadcast'
import { resolveLaneTimeline, laneDurationSec } from '@moc/types/broadcast'
import type { PlayablePlaylist } from '@/data/fetch-broadcast'

const TICK_MS = 100

export type LaneTrack = {
    id: string
    type: string
    name: string | null
    resolved: ResolvedCue[]
    /** Lane length (s). Each lane loops independently within the playlist. */
    lengthSec: number
}

// Drives N parallel lanes off one shared wall clock. Each cue's window
// is the cumulative sum of durations within its lane (ADR-0004) — no
// natural-end advance; positions are computed. A single image-only lane
// is identical to the old linear player. playbackMode 'loop' only (v1);
// 'stop'/'sequence' fall through to loop, as before.
export function useMultitrackPlayer(playable: PlayablePlaylist) {
    const { playlist } = playable
    const defaultImageDuration = playlist.defaultImageDuration

    const durationOf = useCallback((): number | null => null, [])

    // Lane order = z-stack (bottom → top). ADR-0004.
    const lanes = useMemo<LaneTrack[]>(() => {
        return [...playlist.lanes]
            .sort((a, b) => a.order - b.order)
            .map((lane) => {
                const resolved = resolveLaneTimeline(lane, defaultImageDuration, durationOf)
                return {
                    id: lane.id,
                    type: lane.type,
                    name: lane.name,
                    resolved,
                    lengthSec: laneDurationSec(resolved),
                }
            })
            .filter((l) => l.resolved.length > 0)
    }, [playlist.lanes, defaultImageDuration, durationOf])

    const total = useMemo(() => Math.max(0, ...lanes.map((l) => l.lengthSec)), [lanes])

    const [t, setT] = useState(0)
    const [paused, setPaused] = useState(false)
    const tRef = useRef(0)
    useEffect(() => { tRef.current = t }, [t])

    useEffect(() => {
        if (paused || total <= 0) return
        let last = performance.now()
        const id = window.setInterval(() => {
            const now = performance.now()
            const dt = (now - last) / 1000
            last = now
            setT((prev) => {
                const next = prev + dt
                return next >= total ? next - total : next // loop
            })
        }, TICK_MS)
        return () => window.clearInterval(id)
    }, [paused, total])

    // The cue active on each lane right now (lane loops within its own length).
    const activeByLane = useMemo(() => {
        return lanes.map((lane) => {
            if (lane.lengthSec <= 0) return { lane, cue: null as ResolvedCue | null }
            const local = t % lane.lengthSec
            const cue = lane.resolved.find((c) => local >= c.startSec && local < c.startSec + c.durationSec)
                ?? lane.resolved[lane.resolved.length - 1]
            return { lane, cue: cue ?? null }
        })
    }, [lanes, t])

    const boundaries = useMemo(() => {
        const set = new Set<number>([0])
        for (const lane of lanes) for (const c of lane.resolved) set.add(c.startSec)
        return [...set].sort((a, b) => a - b)
    }, [lanes])

    const goNext = useCallback(() => {
        setT((prev) => boundaries.find((b) => b > prev + 0.01) ?? 0)
    }, [boundaries])

    const goPrev = useCallback(() => {
        setT((prev) => [...boundaries].reverse().find((b) => b < prev - 0.01) ?? 0)
    }, [boundaries])

    const togglePaused = useCallback(() => setPaused((p) => !p), [])

    return { lanes, activeByLane, t, total, paused, goNext, goPrev, togglePaused, setPaused }
}
