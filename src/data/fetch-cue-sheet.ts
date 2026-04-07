import type { Checklist, CueSheetEvent, Track } from '@/types/cue-sheet'
import mockChecklists from './mock/cue-sheet-checklists.json'
import mockEvents from './mock/cue-sheet-events.json'
import mockTracks from './mock/cue-sheet-tracks.json'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * ms))
type StoredCueSheetEvent = Omit<CueSheetEvent, 'kind'> & { kind?: CueSheetEvent['kind'] }

export async function fetchCueSheetEvents(): Promise<CueSheetEvent[]> {
    await delay(200)
    return (mockEvents as StoredCueSheetEvent[]).map((event) => ({ ...event, kind: event.kind ?? 'template' }))
}

export async function fetchCueSheetEventById(id: string): Promise<CueSheetEvent | undefined> {
    await delay(100)
    const event = (mockEvents as StoredCueSheetEvent[]).find((item) => item.id === id)
    return event ? { ...event, kind: event.kind ?? 'template' } : undefined
}

export async function fetchCueSheetChecklists(): Promise<Checklist[]> {
    await delay(200)
    return mockChecklists as Checklist[]
}

export async function fetchCueSheetChecklistById(id: string): Promise<Checklist | undefined> {
    await delay(100)
    return (mockChecklists as Checklist[]).find((checklist) => checklist.id === id)
}

export async function fetchCueSheetTracks(): Promise<Record<string, Track[]>> {
    await delay(200)
    return mockTracks as Record<string, Track[]>
}

export async function fetchCueSheetTracksByEventId(eventId: string): Promise<Track[]> {
    await delay(100)
    return (mockTracks as Record<string, Track[]>)[eventId] ?? []
}
