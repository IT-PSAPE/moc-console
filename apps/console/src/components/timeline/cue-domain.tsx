import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import {
    useTimeline as usePrimitiveTimeline,
    type TimelineLaneData,
} from '@moc/ui/components/timeline'
import type { Cue, CueType, Track, TrackColorKey } from '@moc/types/cue-sheet'
import { TRACK_COLORS, type CueFilter, type CueModalState } from './timeline-types'
import { usePlaybackSync, type PlaybackSyncRole } from './use-playback-sync'

// ─── Cue-sheet ⇄ primitive mapping ─────────────────────────────────

type CueData = { label: string; type: CueType; notes?: string }
type LaneData = { name: string; colorKey: TrackColorKey }

export function tracksToLanes(tracks: Track[]): TimelineLaneData[] {
    return tracks.map((t) => ({
        id: t.id,
        type: 'cue',
        data: { name: t.name, colorKey: t.colorKey } satisfies LaneData,
        blocks: t.cues.map((c) => ({
            id: c.id,
            start: c.startMin,
            duration: c.durationMin,
            data: { label: c.label, type: c.type, notes: c.notes } satisfies CueData,
        })),
    }))
}

export function lanesToTracks(lanes: TimelineLaneData[]): Track[] {
    return lanes.map((l) => {
        const ld = l.data as LaneData
        return {
            id: l.id,
            name: ld.name,
            colorKey: ld.colorKey,
            cues: l.blocks.map((b) => {
                const cd = b.data as CueData
                return {
                    id: b.id,
                    label: cd.label,
                    type: cd.type,
                    notes: cd.notes,
                    startMin: b.start,
                    durationMin: b.duration,
                } satisfies Cue
            }),
        } satisfies Track
    })
}

// ─── Domain context (what cue-sheet consumers read) ────────────────

export type TimelinePlaybackSync = {
    eventId: string
    role: PlaybackSyncRole
    persistToDatabase?: boolean
}

type CueSheetTimelineContextValue = {
    tracks: Track[]
    readOnly: boolean
    playbackSync: TimelinePlaybackSync | null
    filter: CueFilter
    setFilter: (f: CueFilter) => void
    cueModal: CueModalState
    openCreateModal: (defaultTrackId?: string, defaultStartMin?: number) => void
    openEditModal: (cue: Cue, trackId: string) => void
    closeCueModal: () => void
    addCue: (trackId: string, data: Omit<Cue, 'id'>) => void
    updateCue: (trackId: string, cueId: string, updates: Partial<Omit<Cue, 'id'>>) => void
    moveCue: (cueId: string, toTrackId: string, startMin: number) => void
    addTrack: (name: string, colorKey?: TrackColorKey) => void
    deleteTrack: (trackId: string) => void
    updateTrack: (trackId: string, updates: Partial<Omit<Track, 'id' | 'cues'>>) => void
}

const CueSheetTimelineContext = createContext<CueSheetTimelineContextValue | null>(null)

export function useTimeline(): CueSheetTimelineContextValue {
    const ctx = useContext(CueSheetTimelineContext)
    if (!ctx) throw new Error('useTimeline must be used within <Timeline>')
    return ctx
}

// ─── Domain provider (inside the primitive, so it can mutate it) ───

type CueDomainProviderProps = {
    tracks: Track[]
    readOnly: boolean
    playbackSync: TimelinePlaybackSync | null
    children: ReactNode
}

export function CueDomainProvider({ tracks, readOnly, playbackSync, children }: CueDomainProviderProps) {
    const prim = usePrimitiveTimeline()
    const [filter, setFilter] = useState<CueFilter>('all')
    const [cueModal, setCueModal] = useState<CueModalState>({ mode: 'closed' })

    const openCreateModal = useCallback((defaultTrackId?: string, defaultStartMin?: number) => {
        if (readOnly) return
        setCueModal({ mode: 'create', defaultTrackId, defaultStartMin })
    }, [readOnly])
    const openEditModal = useCallback((cue: Cue, trackId: string) => {
        if (readOnly) return
        setCueModal({ mode: 'edit', cue, trackId })
    }, [readOnly])
    const closeCueModal = useCallback(() => setCueModal({ mode: 'closed' }), [])

    const findCue = useCallback((trackId: string, cueId: string): Cue | undefined =>
        tracks.find((t) => t.id === trackId)?.cues.find((c) => c.id === cueId), [tracks])

    const addCue = useCallback((trackId: string, data: Omit<Cue, 'id'>) => {
        prim.addBlock(trackId, {
            start: data.startMin,
            duration: data.durationMin,
            data: { label: data.label, type: data.type, notes: data.notes } satisfies CueData,
        })
    }, [prim])

    const updateCue = useCallback((trackId: string, cueId: string, updates: Partial<Omit<Cue, 'id'>>) => {
        const current = findCue(trackId, cueId)
        const nextData: CueData = {
            label: updates.label ?? current?.label ?? '',
            type: updates.type ?? current?.type ?? 'performance',
            notes: updates.notes ?? current?.notes,
        }
        prim.updateBlock(trackId, cueId, {
            start: updates.startMin,
            duration: updates.durationMin,
            data: nextData,
        })
    }, [prim, findCue])

    const moveCue = useCallback((cueId: string, toTrackId: string, startMin: number) => {
        prim.moveBlock(cueId, toTrackId, startMin)
    }, [prim])

    const addTrack = useCallback((name: string, colorKey?: TrackColorKey) => {
        const key = colorKey ?? TRACK_COLORS[prim.lanes.length % TRACK_COLORS.length]
        prim.addLane({ type: 'cue', data: { name, colorKey: key } satisfies LaneData })
    }, [prim])

    const deleteTrack = useCallback((trackId: string) => prim.removeLane(trackId), [prim])

    const updateTrack = useCallback((trackId: string, updates: Partial<Omit<Track, 'id' | 'cues'>>) => {
        const lane = prim.lanes.find((l) => l.id === trackId)
        const ld = (lane?.data as LaneData) ?? { name: '', colorKey: 'blue' }
        prim.updateLane(trackId, { data: { ...ld, ...updates } satisfies LaneData })
    }, [prim])

    const value = useMemo<CueSheetTimelineContextValue>(() => ({
        tracks, readOnly, playbackSync, filter, setFilter,
        cueModal, openCreateModal, openEditModal, closeCueModal,
        addCue, updateCue, moveCue, addTrack, deleteTrack, updateTrack,
    }), [tracks, readOnly, playbackSync, filter, cueModal, openCreateModal, openEditModal, closeCueModal, addCue, updateCue, moveCue, addTrack, deleteTrack, updateTrack])

    return <CueSheetTimelineContext.Provider value={value}>{children}</CueSheetTimelineContext.Provider>
}

// ─── Live-sync bridge: wires usePlaybackSync to the ClockTransport ─

export function PlaybackSyncBridge({ sync }: { sync: TimelinePlaybackSync }) {
    const { currentTime, isPlaying, seek } = usePrimitiveTimeline()

    const applyRemoteState = useCallback((next: { isPlaying: boolean; currentTimeMinutes: number }) => {
        seek(next.currentTimeMinutes)
    }, [seek])

    usePlaybackSync({
        eventId: sync.eventId,
        role: sync.role,
        isPlaying,
        currentTimeMinutes: currentTime,
        applyRemoteState,
        persistToDatabase: sync.persistToDatabase ?? false,
    })
    return null
}
