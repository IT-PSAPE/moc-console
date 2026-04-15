export const CUE_TYPES = ['performance', 'technical', 'equipment', 'announcement', 'transition'] as const
export type CueType = (typeof CUE_TYPES)[number]

export const TRACK_COLOR_KEYS = ['blue', 'purple', 'red', 'green', 'orange', 'pink', 'yellow', 'teal', 'indigo', 'rose', 'sky', 'violet'] as const
export type TrackColorKey = (typeof TRACK_COLOR_KEYS)[number]

const trackColorMap: Record<TrackColorKey, string> = {
    blue: '#3b82f6',
    purple: '#8b5cf6',
    red: '#ef4444',
    green: '#22c55e',
    orange: '#f97316',
    pink: '#ec4899',
    yellow: '#eab308',
    teal: '#14b8a6',
    indigo: '#6366f1',
    rose: '#f43f5e',
    sky: '#0ea5e9',
    violet: '#a855f7',
}

export function resolveTrackColor(colorKey: TrackColorKey): string {
    return trackColorMap[colorKey]
}

export type Cue = {
    id: string
    label: string
    startMin: number // offset in minutes from event start
    durationMin: number
    type: CueType
    assignee?: string
    notes?: string
}

export type Track = {
    id: string
    name: string
    colorKey: TrackColorKey
    cues: Cue[]
}
