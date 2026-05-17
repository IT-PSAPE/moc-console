// ─── Domain-agnostic Timeline primitive — types & constants ────────
// The primitive speaks only Lane + Block. It never imports a domain
// model (cue-sheet Cue / broadcast Cue). See ADR-0003.

export type TimelineBlock = {
    /** Stable id, unique within the Timeline. */
    id: string
    /** Start offset on the time axis, in time-units (e.g. minutes). */
    start: number
    /** Length on the time axis, in time-units. */
    duration: number
    /** Opaque domain payload — the primitive never reads this. */
    data?: unknown
}

export type TimelineLane = {
    /** Stable id, unique within the Timeline. */
    id: string
    /** Domain-defined, primitive-opaque type token. */
    type?: string
    /** Opaque domain payload — the primitive never reads this. */
    data?: unknown
    blocks: TimelineBlock[]
}

// ─── Transport (injected time source) ──────────────────────────────
// The Playhead's motion is driven by a domain-supplied Transport, not
// by the Timeline itself. See ADR-0003.

export type TransportSnapshot = {
    /** Current playhead position, in time-units. */
    currentTime: number
    isPlaying: boolean
}

export interface TimelineTransport {
    getSnapshot(): TransportSnapshot
    subscribe(listener: () => void): () => void
    play(): void
    pause(): void
    toggle(): void
    /** Move the playhead. Clamped to [0, duration] by the transport. */
    seek(time: number): void
}

// ─── Constants ─────────────────────────────────────────────────────

export const MIN_ZOOM = 1
export const MAX_EFFECTIVE_ZOOM = 8
export const ZOOM_FACTOR = 1.1
export const BASE_PIXELS_PER_UNIT = 8
export const LANE_HEIGHT = 56
export const RULER_HEIGHT = 36
export const SIDEBAR_WIDTH = 180
export const PLAYHEAD_FOLLOW_THRESHOLD_RATIO = 0.75
export const PLAYHEAD_DRAG_EDGE_THRESHOLD_RATIO = 0.06
export const PLAYHEAD_DRAG_MIN_EDGE_THRESHOLD_PX = 14.4
export const BLOCK_DRAG_CLICK_SUPPRESS_MS = 120
export const TIMELINE_HORIZONTAL_PADDING = 8

// ─── Drag state ────────────────────────────────────────────────────

export type BlockDragState = {
    blockId: string
    laneId: string
    type: 'move' | 'resize-start' | 'resize-end'
    startX: number
    startY: number
    startValue: number
    startDuration: number
}

export type LaneDragState = {
    laneId: string
    startIndex: number
    currentIndex: number
}

// ─── Time helpers ──────────────────────────────────────────────────

/** Default mm:ss formatter for axis labels. Overridable via <Timeline.Ruler format>. */
export function formatClock(value: number): string {
    const whole = Math.floor(value)
    const frac = Math.floor((value - whole) * 60)
    return `${whole.toString().padStart(2, '0')}:${frac.toString().padStart(2, '0')}`
}

export function getMarkerInterval(effectiveZoom: number, total: number): number {
    if (effectiveZoom >= 2) return 5
    if (effectiveZoom >= 1) return total <= 60 ? 10 : 15
    return total <= 60 ? 15 : 30
}

export function buildTimeMarkers(total: number, interval: number): number[] {
    const markers: number[] = []
    for (let i = 0; i <= total; i += interval) markers.push(i)
    return markers
}
