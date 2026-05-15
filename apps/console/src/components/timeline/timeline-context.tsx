import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import type { Track, Cue, TrackColorKey } from '@/types/cue-sheet'
import type { CueModalState, CueFilter } from './timeline-types'
import { useTimelineZoom } from './use-timeline-zoom'
import { useTimelinePlayback } from './use-timeline-playback'
import { useCueDrag } from './use-cue-drag'
import { usePlayheadDrag } from './use-playhead-drag'
import { useTrackDrag } from './use-track-drag'
import { usePlaybackSync, type PlaybackSyncRole } from './use-playback-sync'
import { randomId } from '@/utils/random-id'

// ─── Context Type ──────────────────────────────────────────────────

export type TimelinePlaybackSync = {
    eventId: string
    role: PlaybackSyncRole
    /** When true (controllers), debounced state is persisted to event_playback_state. */
    persistToDatabase?: boolean
}

export interface TimelineContextValue {
    tracks: Track[]
    totalMinutes: number
    readOnly: boolean
    playbackSync: TimelinePlaybackSync | null

    // Zoom
    effectiveZoom: number
    pixelsPerMinute: number
    updateZoomAnchoredToPlayhead: (direction: 'in' | 'out') => void

    // Playback
    currentTimeMinutes: number
    setCurrentTimeMinutes: React.Dispatch<React.SetStateAction<number>>
    isPlaying: boolean
    handlePlayPause: () => void

    // Playhead drag
    handlePlayheadPointerDown: (e: React.PointerEvent) => void

    // Cue drag
    justDraggedRef: RefObject<boolean>
    startCueDrag: (e: React.PointerEvent, cue: Cue, trackId: string, type: 'move' | 'resize-left' | 'resize-right') => void
    cueDragState: import('./timeline-types').CueDragState | null

    // Track drag
    trackDragState: { trackId: string; startIndex: number; currentIndex: number } | null
    handleTrackDragStart: (trackId: string, index: number, e: React.PointerEvent) => void

    // Refs
    onTimelineContainerRef: (node: HTMLDivElement | null) => void
    timelineContainerRef: RefObject<HTMLDivElement | null>
    trackRowsRef: RefObject<HTMLDivElement | null>

    // Track/cue actions
    onTrackClick: (trackId: string, startMinute: number) => void
    onCueClick: (cue: Cue, trackId: string) => void
    addTrack: (name: string, colorKey?: TrackColorKey) => void
    deleteTrack: (trackId: string) => void
    updateTrack: (trackId: string, updates: Partial<Omit<Track, 'id' | 'cues'>>) => void
    deleteCue: (trackId: string, cueId: string) => void
    addCue: (trackId: string, data: Omit<Cue, 'id'>) => void
    updateCue: (trackId: string, cueId: string, updates: Partial<Omit<Cue, 'id'>>) => void
    moveCue: (cueId: string, toTrackId: string, startMinute: number) => void

    // Modal
    cueModal: CueModalState
    openCreateModal: (defaultTrackId?: string, defaultStartMin?: number) => void
    openEditModal: (cue: Cue, trackId: string) => void
    closeCueModal: () => void

    // Filter (fade, not hide)
    filter: CueFilter
    setFilter: (filter: CueFilter) => void
}

const TimelineContext = createContext<TimelineContextValue | null>(null)

export function useTimeline(): TimelineContextValue {
    const ctx = useContext(TimelineContext)
    if (!ctx) throw new Error('useTimeline must be used within Timeline')
    return ctx
}

// ─── Provider ──────────────────────────────────────────────────────

interface TimelineProviderProps {
    children: ReactNode
    tracks: Track[]
    totalMinutes: number
    onChange?: (tracks: Track[]) => void
    readOnly?: boolean
    /** Optional: opt into Realtime playback sync via Supabase broadcast. */
    playbackSync?: TimelinePlaybackSync | null
    /** Initial playback state (used when joining an in-progress live session). */
    initialPlayback?: { currentTimeMinutes: number; isPlaying: boolean }
}

export function TimelineProvider({ children, tracks, totalMinutes, onChange, readOnly = false, playbackSync = null, initialPlayback }: TimelineProviderProps) {
    const timelineContainerRef = useRef<HTMLDivElement | null>(null)
    const [timelineContainerEl, setTimelineContainerEl] = useState<HTMLDivElement | null>(null)
    const onTimelineContainerRef = useCallback((node: HTMLDivElement | null) => {
        timelineContainerRef.current = node
        setTimelineContainerEl(node)
    }, [])
    const trackRowsRef = useRef<HTMLDivElement | null>(null)
    const currentTimeMinutesRef = useRef(0)
    const isDraggingPlayheadRef = useRef(false)
    const [isPinchGestureActive, setIsPinchGestureActive] = useState(false)

    // ── Modal state ────────────────────────────────────────────────
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

    // ── Filter state (fade, not hide) ──────────────────────────────
    const [filter, setFilter] = useState<CueFilter>('all')

    // ── Track/cue mutation helpers ─────────────────────────────────
    const onChangeRef = useRef(onChange)

    useEffect(() => {
        onChangeRef.current = onChange
    }, [onChange])

    const updateTracks = useCallback((updater: (prev: Track[]) => Track[]) => {
        if (readOnly) return
        const next = updater(tracks)
        onChangeRef.current?.(next)
    }, [tracks, readOnly])

    const addTrack = useCallback((name: string, colorKey?: TrackColorKey) => {
        const COLORS: TrackColorKey[] = ['blue', 'purple', 'red', 'green', 'orange', 'pink', 'yellow', 'teal']
        updateTracks((prev) => [...prev, { id: randomId(), name, colorKey: colorKey ?? COLORS[prev.length % COLORS.length], cues: [] }])
    }, [updateTracks])

    const deleteTrack = useCallback((trackId: string) => {
        updateTracks((prev) => prev.filter((t) => t.id !== trackId))
    }, [updateTracks])

    const updateTrack = useCallback((trackId: string, updates: Partial<Omit<Track, 'id' | 'cues'>>) => {
        updateTracks((prev) => prev.map((t) => t.id === trackId ? { ...t, ...updates } : t))
    }, [updateTracks])

    const reorderTracks = useCallback((fromIndex: number, toIndex: number) => {
        updateTracks((prev) => {
            const next = [...prev]
            const [moved] = next.splice(fromIndex, 1)
            next.splice(toIndex, 0, moved)
            return next
        })
    }, [updateTracks])

    const deleteCue = useCallback((trackId: string, cueId: string) => {
        updateTracks((prev) => prev.map((t) => t.id === trackId ? { ...t, cues: t.cues.filter((c) => c.id !== cueId) } : t))
    }, [updateTracks])

    const addCue = useCallback((trackId: string, data: Omit<Cue, 'id'>) => {
        updateTracks((prev) => prev.map((t) => t.id === trackId ? { ...t, cues: [...t.cues, { ...data, id: randomId() }] } : t))
    }, [updateTracks])

    const updateCue = useCallback((trackId: string, cueId: string, updates: Partial<Omit<Cue, 'id'>>) => {
        updateTracks((prev) => prev.map((t) =>
            t.id === trackId ? { ...t, cues: t.cues.map((c) => c.id === cueId ? { ...c, ...updates } : c) } : t
        ))
    }, [updateTracks])

    const moveCue = useCallback((cueId: string, toTrackId: string, startMinute: number) => {
        updateTracks((prev) => {
            let cue: Cue | undefined
            const without = prev.map((t) => {
                const found = t.cues.find((c) => c.id === cueId)
                if (found) cue = found
                return { ...t, cues: t.cues.filter((c) => c.id !== cueId) }
            })
            if (!cue) return prev
            const movedCue = { ...cue, startMin: startMinute }
            return without.map((t) => t.id === toTrackId ? { ...t, cues: [...t.cues, movedCue] } : t)
        })
    }, [updateTracks])

    // ── Hooks ──────────────────────────────────────────────────────
    const zoom = useTimelineZoom({ totalMinutes, timelineContainer: timelineContainerEl, currentTimeMinutesRef, onPinchStateChange: setIsPinchGestureActive })

    // Followers don't run their own ticker — playhead is driven entirely by inbound broadcasts.
    const isFollower = playbackSync?.role === 'follower'
    const playback = useTimelinePlayback({ totalMinutes, pixelsPerMinute: zoom.pixelsPerMinute, timelineContainerRef, isDraggingPlayheadRef, suppressLocalTicker: isFollower })

    // Seed initial playback state once
    const initialPlaybackAppliedRef = useRef(false)
    useEffect(() => {
        if (initialPlaybackAppliedRef.current || !initialPlayback) return
        initialPlaybackAppliedRef.current = true
        playback.setCurrentTimeMinutes(initialPlayback.currentTimeMinutes)
        playback.setIsPlaying(initialPlayback.isPlaying)
    }, [initialPlayback, playback])

    useEffect(() => {
        currentTimeMinutesRef.current = playback.currentTimeMinutes
    }, [playback.currentTimeMinutes])

    // Live sync: subscribe to broadcast channel and apply remote state
    const applyRemoteState = useCallback((next: { isPlaying: boolean; currentTimeMinutes: number }) => {
        playback.setIsPlaying(next.isPlaying)
        playback.setCurrentTimeMinutes(next.currentTimeMinutes)
    }, [playback])

    usePlaybackSync({
        eventId: playbackSync?.eventId ?? null,
        role: playbackSync?.role ?? 'follower',
        isPlaying: playback.isPlaying,
        currentTimeMinutes: playback.currentTimeMinutes,
        applyRemoteState,
        persistToDatabase: playbackSync?.persistToDatabase ?? false,
    })

    const playheadDrag = usePlayheadDrag({ pixelsPerMinute: zoom.pixelsPerMinute, totalMinutes, timelineContainerRef, setCurrentTimeMinutes: playback.setCurrentTimeMinutes, isDraggingPlayheadRef, disableTouchInteractions: isPinchGestureActive || readOnly })

    const cueDrag = useCueDrag({ tracks, totalMinutes, pixelsPerMinute: zoom.pixelsPerMinute, trackRowsRef, disableTouchInteractions: isPinchGestureActive || readOnly, onMoveCue: moveCue, onUpdateCue: updateCue })

    const trackDrag = useTrackDrag({ tracks, onReorderTracks: reorderTracks, disableTouchInteractions: isPinchGestureActive || readOnly })

    // ── Click handlers ─────────────────────────────────────────────
    const onTrackClick = useCallback((trackId: string, startMinute: number) => {
        if (readOnly) return
        openCreateModal(trackId, startMinute)
    }, [openCreateModal, readOnly])

    const onCueClick = useCallback((cue: Cue, trackId: string) => {
        if (readOnly) return
        openEditModal(cue, trackId)
    }, [openEditModal, readOnly])

    // ── Context value ──────────────────────────────────────────────
    const value = useMemo<TimelineContextValue>(() => ({
        tracks, totalMinutes, readOnly, playbackSync,
        effectiveZoom: zoom.effectiveZoom, pixelsPerMinute: zoom.pixelsPerMinute, updateZoomAnchoredToPlayhead: zoom.updateZoomAnchoredToPlayhead,
        currentTimeMinutes: playback.currentTimeMinutes, setCurrentTimeMinutes: playback.setCurrentTimeMinutes, isPlaying: playback.isPlaying, handlePlayPause: playback.handlePlayPause,
        handlePlayheadPointerDown: playheadDrag.handlePlayheadPointerDown,
        justDraggedRef: cueDrag.justDraggedRef, startCueDrag: cueDrag.startCueDrag, cueDragState: cueDrag.dragState,
        trackDragState: trackDrag.trackDragState, handleTrackDragStart: trackDrag.handleTrackDragStart,
        onTimelineContainerRef, timelineContainerRef, trackRowsRef,
        onTrackClick, onCueClick,
        addTrack, deleteTrack, updateTrack, deleteCue, addCue, updateCue, moveCue,
        cueModal, openCreateModal, openEditModal, closeCueModal,
        filter, setFilter,
    }),
    [tracks, totalMinutes, readOnly, playbackSync, zoom, playback, playheadDrag, cueDrag, trackDrag, onTimelineContainerRef, timelineContainerRef, trackRowsRef, onTrackClick, onCueClick, addTrack, deleteTrack, updateTrack, deleteCue, addCue, updateCue, moveCue, cueModal, openCreateModal, openEditModal, closeCueModal, filter, setFilter])

    return <TimelineContext.Provider value={value}>{children}</TimelineContext.Provider>
}
