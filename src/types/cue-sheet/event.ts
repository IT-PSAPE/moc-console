export type CueSheetEvent = {
    id: string
    kind: 'template' | 'instance'
    templateId?: string
    title: string
    description: string
    scheduledAt?: string
    duration: number // total duration in minutes
    createdAt: string
    updatedAt: string
}
