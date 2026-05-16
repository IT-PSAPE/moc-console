import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { randomId } from '@moc/utils/random-id'
import {
    PLAYHEAD_FOLLOW_THRESHOLD_RATIO,
    TIMELINE_HORIZONTAL_PADDING,
    type BlockDragState,
    type LaneDragState,
    type TimelineLane,
    type TimelineTransport,
} from './types'
import { useTransportSnapshot } from './transport'
import { useZoom } from './use-zoom'
import { useBlockDrag } from './use-block-drag'
import { usePlayheadDrag } from './use-playhead-drag'
import { useLaneDrag } from './use-lane-drag'

// ─── Context value ─────────────────────────────────────────────────

export interface TimelineContextValue {
    lanes: TimelineLane[]
    total: number

    // Transport (injected time source — see ADR-0003)
    currentTime: number
    isPlaying: boolean
    play: () => void
    pause: () => void
    toggle: () => void
    seek: (time: number) => void

    // Zoom
    effectiveZoom: number
    pixelsPerUnit: number
    updateZoomAnchoredToPlayhead: (direction: 'in' | 'out') => void

    // Playhead drag
    handlePlayheadPointerDown: (e: React.PointerEvent) => void

    // Block drag
    justDraggedRef: RefObject<boolean>
    startBlockDrag: (e: React.PointerEvent, block: { id: string; start: number; duration: number }, laneId: string, type: BlockDragState['type']) => void
    blockDragState: BlockDragState | null

    // Lane drag
    laneDragState: LaneDragState | null
    handleLaneDragStart: (laneId: string, index: number, e: React.PointerEvent) => void

    // Refs
    onContainerRef: (node: HTMLDivElement | null) => void
    containerRef: RefObject<HTMLDivElement | null>
    laneRowsRef: RefObject<HTMLDivElement | null>

    // Mutations (the persist port — see ADR-0003)
    addLane: (lane?: Partial<Omit<TimelineLane, 'id' | 'blocks'>>) => string
    updateLane: (laneId: string, updates: Partial<Omit<TimelineLane, 'id' | 'blocks'>>) => void
    removeLane: (laneId: string) => void
    reorderLanes: (fromIndex: number, toIndex: number) => void
    addBlock: (laneId: string, block: { start: number; duration: number; data?: unknown }) => string
    updateBlock: (laneId: string, blockId: string, updates: { start?: number; duration?: number; data?: unknown }) => void
    removeBlock: (laneId: string, blockId: string) => void
    moveBlock: (blockId: string, toLaneId: string, start: number) => void
}

const TimelineContext = createContext<TimelineContextValue | null>(null)

export function useTimeline(): TimelineContextValue {
    const ctx = useContext(TimelineContext)
    if (!ctx) throw new Error('useTimeline must be used within <Timeline>')
    return ctx
}

// Per-lane context so <Timeline.Block> / <Timeline.LaneHeader> need no props
// beyond their own identity (no prop drilling — see ADR-0003).

const LaneContext = createContext<{ laneId: string; index: number } | null>(null)

export function useLane() {
    const ctx = useContext(LaneContext)
    if (!ctx) throw new Error('This part must be used within <Timeline.Lane> / <Timeline.LaneHeader>')
    return ctx
}

export function LaneProvider({ laneId, index, children }: { laneId: string; index: number; children: ReactNode }) {
    const value = useMemo(() => ({ laneId, index }), [laneId, index])
    return <LaneContext.Provider value={value}>{children}</LaneContext.Provider>
}

// ─── Provider ──────────────────────────────────────────────────────

interface TimelineProviderProps {
    children: ReactNode
    lanes: TimelineLane[]
    total: number
    transport: TimelineTransport
    onChange?: (lanes: TimelineLane[]) => void
}

export function TimelineProvider({ children, lanes: lanesProp, total, transport, onChange }: TimelineProviderProps) {
    // Provider owns the live working copy; it re-seeds when the consumer feeds
    // a new array identity (e.g. after a persisted round-trip or remote sync).
    // Canonical "adjust state on prop change" pattern.
    const [lanes, setLanes] = useState(lanesProp)
    const [seededFrom, setSeededFrom] = useState(lanesProp)
    if (lanesProp !== seededFrom) {
        setSeededFrom(lanesProp)
        setLanes(lanesProp)
    }

    const onChangeRef = useRef(onChange)
    useEffect(() => { onChangeRef.current = onChange }, [onChange])

    const commit = useCallback((updater: (prev: TimelineLane[]) => TimelineLane[]) => {
        setLanes((prev) => {
            const next = updater(prev)
            onChangeRef.current?.(next)
            return next
        })
    }, [])

    const containerRef = useRef<HTMLDivElement | null>(null)
    const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null)
    const onContainerRef = useCallback((node: HTMLDivElement | null) => {
        containerRef.current = node
        setContainerEl(node)
    }, [])
    const laneRowsRef = useRef<HTMLDivElement | null>(null)
    const currentTimeRef = useRef(0)
    const isDraggingPlayheadRef = useRef(false)
    const [isPinchActive, setIsPinchActive] = useState(false)

    // ── Transport snapshot ─────────────────────────────────────────
    const { currentTime, isPlaying } = useTransportSnapshot(transport)
    useEffect(() => { currentTimeRef.current = currentTime }, [currentTime])
    const seek = useCallback((t: number) => transport.seek(t), [transport])

    // ── Mutations ──────────────────────────────────────────────────
    const addLane = useCallback((lane?: Partial<Omit<TimelineLane, 'id' | 'blocks'>>) => {
        const id = randomId()
        commit((prev) => [...prev, { id, blocks: [], ...lane }])
        return id
    }, [commit])

    const updateLane = useCallback((laneId: string, updates: Partial<Omit<TimelineLane, 'id' | 'blocks'>>) => {
        commit((prev) => prev.map((l) => (l.id === laneId ? { ...l, ...updates } : l)))
    }, [commit])

    const removeLane = useCallback((laneId: string) => {
        commit((prev) => prev.filter((l) => l.id !== laneId))
    }, [commit])

    const reorderLanes = useCallback((fromIndex: number, toIndex: number) => {
        commit((prev) => {
            const next = [...prev]
            const [moved] = next.splice(fromIndex, 1)
            next.splice(toIndex, 0, moved)
            return next
        })
    }, [commit])

    const addBlock = useCallback((laneId: string, block: { start: number; duration: number; data?: unknown }) => {
        const id = randomId()
        commit((prev) => prev.map((l) => (l.id === laneId ? { ...l, blocks: [...l.blocks, { ...block, id }] } : l)))
        return id
    }, [commit])

    const updateBlock = useCallback((laneId: string, blockId: string, updates: { start?: number; duration?: number; data?: unknown }) => {
        commit((prev) => prev.map((l) =>
            l.id === laneId ? { ...l, blocks: l.blocks.map((b) => (b.id === blockId ? { ...b, ...updates } : b)) } : l,
        ))
    }, [commit])

    const removeBlock = useCallback((laneId: string, blockId: string) => {
        commit((prev) => prev.map((l) => (l.id === laneId ? { ...l, blocks: l.blocks.filter((b) => b.id !== blockId) } : l)))
    }, [commit])

    const moveBlock = useCallback((blockId: string, toLaneId: string, start: number) => {
        commit((prev) => {
            let moved: TimelineLane['blocks'][number] | undefined
            const without = prev.map((l) => {
                const found = l.blocks.find((b) => b.id === blockId)
                if (found) moved = found
                return { ...l, blocks: l.blocks.filter((b) => b.id !== blockId) }
            })
            if (!moved) return prev
            const next = { ...moved, start }
            return without.map((l) => (l.id === toLaneId ? { ...l, blocks: [...l.blocks, next] } : l))
        })
    }, [commit])

    // ── Hooks ──────────────────────────────────────────────────────
    const zoom = useZoom({ total, container: containerEl, currentTimeRef, onPinchStateChange: setIsPinchActive })

    const playheadDrag = usePlayheadDrag({
        pixelsPerUnit: zoom.pixelsPerUnit, total, containerRef, seek,
        isDraggingPlayheadRef, disableTouchInteractions: isPinchActive,
    })

    const blockDrag = useBlockDrag({
        lanes, total, pixelsPerUnit: zoom.pixelsPerUnit, laneRowsRef,
        disableTouchInteractions: isPinchActive, onMoveBlock: moveBlock, onUpdateBlock: updateBlock,
    })

    const laneDrag = useLaneDrag({ lanes, onReorderLanes: reorderLanes, disableTouchInteractions: isPinchActive })

    // ── Auto-follow scroll during playback ─────────────────────────
    useEffect(() => {
        const container = containerRef.current
        if (!container || !isPlaying || isDraggingPlayheadRef.current) return
        const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth)
        if (maxScrollLeft <= 0) return
        const playheadTimelineX = currentTime * zoom.pixelsPerUnit + TIMELINE_HORIZONTAL_PADDING
        const playheadViewportX = playheadTimelineX - container.scrollLeft
        const thresholdX = container.clientWidth * PLAYHEAD_FOLLOW_THRESHOLD_RATIO
        if (playheadViewportX < thresholdX) return
        container.scrollLeft = Math.min(maxScrollLeft, Math.max(0, playheadTimelineX - thresholdX))
    }, [currentTime, isPlaying, zoom.pixelsPerUnit])

    const value = useMemo<TimelineContextValue>(() => ({
        lanes, total,
        currentTime, isPlaying,
        play: transport.play.bind(transport),
        pause: transport.pause.bind(transport),
        toggle: transport.toggle.bind(transport),
        seek,
        effectiveZoom: zoom.effectiveZoom, pixelsPerUnit: zoom.pixelsPerUnit, updateZoomAnchoredToPlayhead: zoom.updateZoomAnchoredToPlayhead,
        handlePlayheadPointerDown: playheadDrag.handlePlayheadPointerDown,
        justDraggedRef: blockDrag.justDraggedRef, startBlockDrag: blockDrag.startBlockDrag, blockDragState: blockDrag.dragState,
        laneDragState: laneDrag.laneDragState, handleLaneDragStart: laneDrag.handleLaneDragStart,
        onContainerRef, containerRef, laneRowsRef,
        addLane, updateLane, removeLane, reorderLanes,
        addBlock, updateBlock, removeBlock, moveBlock,
    }), [
        lanes, total, currentTime, isPlaying, transport, seek, zoom, playheadDrag, blockDrag, laneDrag,
        onContainerRef, addLane, updateLane, removeLane, reorderLanes, addBlock, updateBlock, removeBlock, moveBlock,
    ])

    return <TimelineContext.Provider value={value}>{children}</TimelineContext.Provider>
}
