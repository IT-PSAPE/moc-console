import { useCallback, useMemo } from "react"
import { useClockTransport, type TimelineLaneData } from "@moc/ui/components/timeline"
import type { Cue, MediaItem, PlaylistLane } from "@moc/types/broadcast"
import { resolveLaneTimeline, laneDurationSec } from "@moc/types/broadcast"

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

    const durationOf = useCallback(
        (cue: Cue) => mediaItems.find((m) => m.id === cue.mediaItemId)?.duration ?? null,
        [mediaItems],
    )

    const resolvedLanes = useMemo(
        () => lanes.map((lane) => ({ lane, resolved: resolveLaneTimeline(lane, defaultImageDuration, durationOf) })),
        [lanes, defaultImageDuration, durationOf],
    )

    const total = useMemo(
        () => Math.max(60, ...resolvedLanes.map(({ resolved }) => laneDurationSec(resolved))),
        [resolvedLanes],
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

    const transport = useClockTransport({ duration: total, atEnd: "loop" })

    const handleChange = useCallback((next: TimelineLaneData[]) => {
        const rebuilt: PlaylistLane[] = next.map((l, laneIndex) => {
            const ordered = [...l.blocks].sort((a, b) => a.start - b.start)
            return {
                id: l.id,
                order: laneIndex,
                type: (l.type as PlaylistLane["type"]) ?? "visual",
                name: (l.data as { name: string | null } | undefined)?.name ?? null,
                cues: ordered.map((b, i) => ({ ...(b.data as Cue), laneId: l.id, order: i + 1 })),
            }
        })
        onChange(rebuilt)
    }, [onChange])

    return { primitiveLanes, total, transport, handleChange, thumbById }
}
