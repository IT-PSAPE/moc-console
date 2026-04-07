import type { Checklist, CueSheetEvent, Track } from '@/types/cue-sheet'
import mockChecklists from './mock/cue-sheet-checklists.json'
import mockEvents from './mock/cue-sheet-events.json'
import mockTracks from './mock/cue-sheet-tracks.json'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * ms))
type StoredCueSheetEvent = Omit<CueSheetEvent, 'kind'> & { kind?: CueSheetEvent['kind'] }
type StoredChecklist = Omit<Checklist, 'kind'> & { kind?: Checklist['kind'] }

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
    return (mockChecklists as StoredChecklist[]).map((checklist) => ({ ...checklist, kind: checklist.kind ?? 'template' }))
}

export async function fetchCueSheetChecklistById(id: string): Promise<Checklist | undefined> {
    await delay(100)
    const checklist = (mockChecklists as StoredChecklist[]).find((item) => item.id === id)
    return checklist ? { ...checklist, kind: checklist.kind ?? 'template' } : undefined
}

export async function fetchCueSheetTracks(): Promise<Record<string, Track[]>> {
    await delay(200)
    return mockTracks as Record<string, Track[]>
}

export async function fetchCueSheetTracksByEventId(eventId: string): Promise<Track[]> {
    await delay(100)
    return (mockTracks as Record<string, Track[]>)[eventId] ?? []
}
