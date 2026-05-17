import { useCallback, useMemo } from 'react'
import type { Cue } from '@moc/types/broadcast'
import { usePlaylistClock, usePlaylistProgram } from '@moc/player'
import type { PlayablePlaylist } from '@/data/fetch-broadcast'

// Thin MOC Broadcast adapter over the shared @moc/player engine (ADR-0005).
// All playback logic — resolve, master clock, per-lane windows, alpha
// compositing — lives in @moc/player and is identical to the Console
// preview. This hook only adapts the playlist's media map + adds the
// boundary-based prev/next that the public chrome needs.
export function useMultitrackPlayer(playable: PlayablePlaylist) {
    const { playlist, mediaById } = playable

    // Real intrinsic source duration so the resolver derives video/audio
    // length from its trim window (one resolution path, shared with Console).
    const durationOf = useCallback(
        (cue: Cue): number | null => mediaById[cue.mediaItemId]?.duration ?? null,
        [mediaById],
    )

    const { lanes, total } = usePlaylistProgram({
        lanes: playlist.lanes,
        defaultImageDuration: playlist.defaultImageDuration,
        durationOf,
    })

    // Authoritative master clock (loops at the longest lane). It IS the
    // Timeline transport contract, so chrome reads it via useTransportSnapshot.
    const transport = usePlaylistClock({ duration: total, atEnd: 'loop' })

    // Clip boundaries across all lanes → SkipBack/SkipForward targets.
    const boundaries = useMemo(() => {
        const set = new Set<number>([0])
        for (const lane of lanes) for (const c of lane.resolved) set.add(c.startSec)
        return [...set].sort((a, b) => a - b)
    }, [lanes])

    const goNext = useCallback(() => {
        const at = transport.getSnapshot().currentTime
        transport.seek(boundaries.find((b) => b > at + 0.01) ?? 0)
    }, [boundaries, transport])

    const goPrev = useCallback(() => {
        const at = transport.getSnapshot().currentTime
        transport.seek([...boundaries].reverse().find((b) => b < at - 0.01) ?? 0)
    }, [boundaries, transport])

    const resolveUrl = useCallback(
        (mediaItemId: string): string | undefined => mediaById[mediaItemId]?.url,
        [mediaById],
    )

    return { lanes, total, transport, goPrev, goNext, resolveUrl }
}
