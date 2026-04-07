export type Cue = {
    id: string
    label: string
    startMin: number // offset in minutes from event start
    durationMin: number
    color: string
}

export type Track = {
    id: string
    name: string
    cues: Cue[]
}
