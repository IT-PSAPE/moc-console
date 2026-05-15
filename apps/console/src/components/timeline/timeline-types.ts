import type { CueType, Cue } from '@moc/types/cue-sheet'
import { TRACK_COLOR_KEYS } from '@moc/types/cue-sheet'

// ─── Constants ─────────────────────────────────────────────────────

export const MIN_ZOOM = 1
export const MAX_EFFECTIVE_ZOOM = 8
export const ZOOM_FACTOR = 1.1
export const BASE_PIXELS_PER_MINUTE = 8
export const TRACK_HEIGHT = 56
export const TIME_RULER_HEIGHT = 36
export const SIDEBAR_WIDTH = 180
export const PLAYBACK_TICK_MS = 50
export const PLAYBACK_SPEED_MULTIPLIER = 1
export const PLAYHEAD_FOLLOW_THRESHOLD_RATIO = 0.75
export const PLAYHEAD_DRAG_EDGE_THRESHOLD_RATIO = 0.06
export const PLAYHEAD_DRAG_MIN_EDGE_THRESHOLD_PX = 14.4
export const CUE_DRAG_CLICK_SUPPRESS_MS = 120
export const TIMELINE_HORIZONTAL_PADDING = 8

// ─── Track Colors ──────────────────────────────────────────────────

export const TRACK_COLORS = [...TRACK_COLOR_KEYS] as const

// ─── Cue Type Config ───────────────────────────────────────────────

export const CUE_TYPE_CONFIG: Record<CueType, { label: string }> = {
    performance: { label: 'Performance' },
    technical: { label: 'Technical' },
    equipment: { label: 'Equipment' },
    announcement: { label: 'Announcement' },
    transition: { label: 'Transition' },
}

// ─── Drag State ────────────────────────────────────────────────────

export type CueDragState = {
    cueId: string
    trackId: string
    type: 'move' | 'resize-left' | 'resize-right'
    startX: number
    startY: number
    startMinute: number
    startDuration: number
}

// ─── Modal State ───────────────────────────────────────────────────

export type CueModalState =
    | { mode: 'closed' }
    | { mode: 'create'; defaultTrackId?: string; defaultStartMin?: number }
    | { mode: 'edit'; cue: Cue; trackId: string }

export type CueFormData = {
    label: string
    trackId: string
    type: CueType
    startMin: number
    durationMin: number
    notes: string
}

// ─── Filter ────────────────────────────────────────────────────────

export type CueFilter = CueType | 'all'

// ─── Utility functions ─────────────────────────────────────────────

export function formatTimeDisplay(minutes: number): string {
    const mins = Math.floor(minutes)
    const secs = Math.floor((minutes - mins) * 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export function getMarkerInterval(effectiveZoom: number, totalMinutes: number): number {
    if (effectiveZoom >= 2) return 5
    if (effectiveZoom >= 1) return totalMinutes <= 60 ? 10 : 15
    return totalMinutes <= 60 ? 15 : 30
}

export function buildTimeMarkers(totalMinutes: number, markerInterval: number): number[] {
    const markers: number[] = []
    for (let i = 0; i <= totalMinutes; i += markerInterval) {
        markers.push(i)
    }
    return markers
}
