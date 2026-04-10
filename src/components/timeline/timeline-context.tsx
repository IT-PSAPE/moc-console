import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import type { Track, Cue } from '@/types/cue-sheet'
import type { CueModalState, CueFilter } from './timeline-types'
import { useTimelineZoom } from './use-timeline-zoom'
import { useTimelinePlayback } from './use-timeline-playback'
import { useCueDrag } from './use-cue-drag'
import { usePlayheadDrag } from './use-playhead-drag'
import { useTrackDrag } from './use-track-drag'

// ─── Context Type ──────────────────────────────────────────────────

export interface TimelineContextValue {
    tracks: Track[]
    totalMinutes: number

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
    addTrack: (name: string, color?: string) => void
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
    if (!ctx) throw new Error('useTimeline must be used within Timeline.Root')
    return ctx
}

// ─── Provider ──────────────────────────────────────────────────────

interface TimelineProviderProps {
    children: ReactNode
    tracks: Track[]
    totalMinutes: number
    onChange?: (tracks: Track[]) => void
}

export function TimelineProvider({ children, tracks, totalMinutes, onChange }: TimelineProviderProps) {
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
        setCueModal({ mode: 'create', defaultTrackId, defaultStartMin })
    }, [])
    const openEditModal = useCallback((cue: Cue, trackId: string) => {
        setCueModal({ mode: 'edit', cue, trackId })
    }, [])
    const closeCueModal = useCallback(() => setCueModal({ mode: 'closed' }), [])

    // ── Filter state (fade, not hide) ──────────────────────────────
    const [filter, setFilter] = useState<CueFilter>('all')

    // ── Track/cue mutation helpers ─────────────────────────────────
    const onChangeRef = useRef(onChange)

    useEffect(() => {
        onChangeRef.current = onChange
    }, [onChange])

    const updateTracks = useCallback((updater: (prev: Track[]) => Track[]) => {
        const next = updater(tracks)
        onChangeRef.current?.(next)
    }, [tracks])

    const addTrack = useCallback((name: string, color?: string) => {
        const COLORS = ['#3b82f6', '#8b5cf6', '#ef4444', '#22c55e', '#f97316', '#ec4899', '#eab308', '#14b8a6']
        updateTracks((prev) => [...prev, { id: crypto.randomUUID(), name, color: color ?? COLORS[prev.length % COLORS.length], cues: [] }])
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
        updateTracks((prev) => prev.map((t) => t.id === trackId ? { ...t, cues: [...t.cues, { ...data, id: crypto.randomUUID() }] } : t))
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
    const playback = useTimelinePlayback({ totalMinutes, pixelsPerMinute: zoom.pixelsPerMinute, timelineContainerRef, isDraggingPlayheadRef })

    useEffect(() => {
        currentTimeMinutesRef.current = playback.currentTimeMinutes
    }, [playback.currentTimeMinutes])

    const playheadDrag = usePlayheadDrag({ pixelsPerMinute: zoom.pixelsPerMinute, totalMinutes, timelineContainerRef, setCurrentTimeMinutes: playback.setCurrentTimeMinutes, isDraggingPlayheadRef, disableTouchInteractions: isPinchGestureActive })

    const cueDrag = useCueDrag({ tracks, totalMinutes, pixelsPerMinute: zoom.pixelsPerMinute, trackRowsRef, disableTouchInteractions: isPinchGestureActive, onMoveCue: moveCue, onUpdateCue: updateCue })

    const trackDrag = useTrackDrag({ tracks, onReorderTracks: reorderTracks, disableTouchInteractions: isPinchGestureActive })

    // ── Click handlers ─────────────────────────────────────────────
    const onTrackClick = useCallback((trackId: string, startMinute: number) => {
        openCreateModal(trackId, startMinute)
    }, [openCreateModal])

    const onCueClick = useCallback((cue: Cue, trackId: string) => {
        openEditModal(cue, trackId)
    }, [openEditModal])

    // ── Context value ──────────────────────────────────────────────
    const value = useMemo<TimelineContextValue>(() => ({
        tracks, totalMinutes,
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
    [tracks, totalMinutes, zoom, playback, playheadDrag, cueDrag, trackDrag, onTimelineContainerRef, timelineContainerRef, trackRowsRef, onTrackClick, onCueClick, addTrack, deleteTrack, updateTrack, deleteCue, addCue, updateCue, moveCue, cueModal, openCreateModal, openEditModal, closeCueModal, filter, setFilter])

    return <TimelineContext.Provider value={value}>{children}</TimelineContext.Provider>
}
