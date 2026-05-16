// Cue-sheet *domain* types & config. The generic timeline mechanics (zoom,
// drag, constants) now live in the @moc/ui Timeline primitive — see ADR-0003.
import type { CueType, Cue } from '@moc/types/cue-sheet'
import { TRACK_COLOR_KEYS } from '@moc/types/cue-sheet'

// ─── Track colours ─────────────────────────────────────────────────

export const TRACK_COLORS = [...TRACK_COLOR_KEYS] as const

// ─── Cue type config ───────────────────────────────────────────────

export const CUE_TYPE_CONFIG: Record<CueType, { label: string }> = {
    performance: { label: 'Performance' },
    technical: { label: 'Technical' },
    equipment: { label: 'Equipment' },
    announcement: { label: 'Announcement' },
    transition: { label: 'Transition' },
}

// ─── Modal state ───────────────────────────────────────────────────

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

// ─── Filter (fade, not hide) ───────────────────────────────────────

export type CueFilter = CueType | 'all'
