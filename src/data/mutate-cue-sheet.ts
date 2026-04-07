import type { Checklist, CueSheetEvent, Track } from '@/types/cue-sheet'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 100 + ms))

export async function saveCueSheetEvent(event: CueSheetEvent): Promise<CueSheetEvent> {
    await delay(100)
    return event
}

export async function deleteCueSheetEvent(id: string): Promise<void> {
    void id
    await delay(100)
}

export async function saveCueSheetChecklist(checklist: Checklist): Promise<Checklist> {
    await delay(100)
    return checklist
}

export async function deleteCueSheetChecklist(id: string): Promise<void> {
    void id
    await delay(100)
}

export async function saveCueSheetTracks(_eventId: string, tracks: Track[]): Promise<Track[]> {
    await delay(100)
    return tracks
}
