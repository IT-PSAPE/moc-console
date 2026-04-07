import type { CueSheetEvent, Checklist, Track } from '@/types/cue-sheet'
import {
    fetchCueSheetChecklists,
    fetchCueSheetEventById,
    fetchCueSheetEvents,
    fetchCueSheetTracks,
    fetchCueSheetTracksByEventId,
} from '@/data/fetch-cue-sheet'
import {
    deleteCueSheetChecklist,
    deleteCueSheetEvent,
    saveCueSheetChecklist,
    saveCueSheetEvent,
    saveCueSheetTracks,
} from '@/data/mutate-cue-sheet'
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

// ─── Context ────────────────────────────────────────────────────────

type CueSheetContextValue = {
    state: {
        events: CueSheetEvent[]
        checklists: Checklist[]
        eventsById: Record<string, CueSheetEvent>
        tracksByEventId: Record<string, Track[]>
        isLoadingEvents: boolean
        isLoadingChecklists: boolean
    }
    actions: {
        loadEvents: () => Promise<void>
        loadChecklists: () => Promise<void>
        loadEvent: (id: string) => Promise<void>
        syncChecklist: (checklist: Checklist) => Promise<void>
        syncEvent: (event: CueSheetEvent) => Promise<void>
        syncTracks: (eventId: string, tracks: Track[]) => Promise<void>
        createEventInstance: (template: CueSheetEvent) => Promise<CueSheetEvent>
        removeEvent: (id: string) => Promise<void>
        removeChecklist: (id: string) => Promise<void>
    }
}

function duplicateTracks(tracks: Track[]): Track[] {
    return tracks.map((track) => ({
        ...track,
        id: crypto.randomUUID(),
        cues: track.cues.map((cue) => ({
            ...cue,
            id: crypto.randomUUID(),
        })),
    }))
}

const CueSheetContext = createContext<CueSheetContextValue | null>(null)

export function CueSheetProvider({ children }: { children: ReactNode }) {
    const [eventsById, setEventsById] = useState<Record<string, CueSheetEvent>>({})
    const [checklists, setChecklists] = useState<Checklist[]>([])
    const [tracksByEventId, setTracksByEventId] = useState<Record<string, Track[]>>({})
    const [isLoadingEvents, setIsLoadingEvents] = useState(false)
    const [isLoadingChecklists, setIsLoadingChecklists] = useState(false)

    const eventsLoadedRef = useRef(false)
    const checklistsLoadedRef = useRef(false)
    const eventsPromiseRef = useRef<Promise<void> | null>(null)
    const checklistsPromiseRef = useRef<Promise<void> | null>(null)

    const loadEvents = useCallback(async () => {
        if (eventsLoadedRef.current) return
        if (eventsPromiseRef.current) return eventsPromiseRef.current

        setIsLoadingEvents(true)
        eventsPromiseRef.current = Promise.all([fetchCueSheetEvents(), fetchCueSheetTracks()])
            .then(([events, tracks]) => {
                const byId: Record<string, CueSheetEvent> = {}
                for (const event of events) byId[event.id] = event
                setEventsById(byId)
                setTracksByEventId(tracks)
                eventsLoadedRef.current = true
            })
            .finally(() => {
                eventsPromiseRef.current = null
                setIsLoadingEvents(false)
            })

        return eventsPromiseRef.current
    }, [])

    const loadChecklists = useCallback(async () => {
        if (checklistsLoadedRef.current) return
        if (checklistsPromiseRef.current) return checklistsPromiseRef.current

        setIsLoadingChecklists(true)
        checklistsPromiseRef.current = fetchCueSheetChecklists()
            .then((data) => {
                setChecklists(data)
                checklistsLoadedRef.current = true
            })
            .finally(() => {
                checklistsPromiseRef.current = null
                setIsLoadingChecklists(false)
            })

        return checklistsPromiseRef.current
    }, [])

    const loadEvent = useCallback(async (id: string) => {
        if (eventsById[id] && tracksByEventId[id]) return
        const [event, tracks] = await Promise.all([
            fetchCueSheetEventById(id),
            fetchCueSheetTracksByEventId(id),
        ])
        if (!event) return
        setEventsById((prev) => ({ ...prev, [event.id]: event }))
        setTracksByEventId((prev) => ({ ...prev, [id]: tracks }))
    }, [eventsById, tracksByEventId])

    const syncChecklist = useCallback(async (checklist: Checklist) => {
        const savedChecklist = await saveCueSheetChecklist(checklist)
        setChecklists((prev) => {
            const idx = prev.findIndex((c) => c.id === savedChecklist.id)
            if (idx === -1) return [...prev, savedChecklist]
            return prev.map((c) => (c.id === savedChecklist.id ? savedChecklist : c))
        })
    }, [])

    const syncEvent = useCallback(async (event: CueSheetEvent) => {
        const savedEvent = await saveCueSheetEvent(event)
        setEventsById((prev) => ({ ...prev, [savedEvent.id]: savedEvent }))
    }, [])

    const syncTracks = useCallback(async (eventId: string, tracks: Track[]) => {
        const savedTracks = await saveCueSheetTracks(eventId, tracks)
        setTracksByEventId((prev) => ({ ...prev, [eventId]: savedTracks }))
    }, [])

    const createEventInstance = useCallback(async (template: CueSheetEvent) => {
        const now = new Date().toISOString()
        const instance: CueSheetEvent = {
            ...template,
            id: crypto.randomUUID(),
            kind: 'instance',
            templateId: template.id,
            title: `${template.title} Run`,
            scheduledAt: now,
            createdAt: now,
            updatedAt: now,
        }
        const sourceTracks = tracksByEventId[template.id] ?? []
        const savedEvent = await saveCueSheetEvent(instance)
        const savedTracks = await saveCueSheetTracks(savedEvent.id, duplicateTracks(sourceTracks))
        setEventsById((prev) => ({ ...prev, [savedEvent.id]: savedEvent }))
        setTracksByEventId((prev) => ({ ...prev, [savedEvent.id]: savedTracks }))
        return savedEvent
    }, [tracksByEventId])

    const removeEvent = useCallback(async (id: string) => {
        await deleteCueSheetEvent(id)
        setEventsById((prev) => {
            const next = { ...prev }
            delete next[id]
            return next
        })
        setTracksByEventId((prev) => {
            const next = { ...prev }
            delete next[id]
            return next
        })
    }, [])

    const removeChecklist = useCallback(async (id: string) => {
        await deleteCueSheetChecklist(id)
        setChecklists((prev) => prev.filter((c) => c.id !== id))
    }, [])

    const events = useMemo(() => Object.values(eventsById), [eventsById])

    const value = useMemo<CueSheetContextValue>(() => ({
        state: {
            events,
            checklists,
            eventsById,
            tracksByEventId,
            isLoadingEvents,
            isLoadingChecklists,
        },
        actions: {
            loadEvents,
            loadChecklists,
            loadEvent,
            syncChecklist,
            syncEvent,
            syncTracks,
            createEventInstance,
            removeEvent,
            removeChecklist,
        },
    }), [events, checklists, eventsById, tracksByEventId, isLoadingEvents, isLoadingChecklists, loadEvents, loadChecklists, loadEvent, syncChecklist, syncEvent, syncTracks, createEventInstance, removeEvent, removeChecklist])

    return <CueSheetContext.Provider value={value}>{children}</CueSheetContext.Provider>
}

export function useCueSheet() {
    const context = useContext(CueSheetContext)

    if (!context) {
        throw new Error('useCueSheet must be used within a CueSheetProvider')
    }

    return context
}
