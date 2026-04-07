export const CUE_TYPES = ['performance', 'technical', 'equipment', 'announcement', 'transition'] as const
export type CueType = (typeof CUE_TYPES)[number]

export type Cue = {
    id: string
    label: string
    startMin: number // offset in minutes from event start
    durationMin: number
    type: CueType
    notes?: string
}

export type Track = {
    id: string
    name: string
    color: string
    cues: Cue[]
}
