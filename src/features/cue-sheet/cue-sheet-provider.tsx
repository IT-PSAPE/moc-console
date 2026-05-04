import type { CueSheetEvent, Checklist, Track } from '@/types/cue-sheet'
import {
    fetchCueSheetChecklists,
    fetchCueSheetEventById,
    fetchCueSheetEvents,
    fetchCueSheetTracks,
    fetchCueSheetTracksByEventId,
} from '@/data/fetch-cue-sheet'
import {
    createCueSheetBlankChecklist,
    createCueSheetBlankEvent,
    createCueSheetChecklistInstance,
    createCueSheetEventInstance,
    deleteCueSheetChecklist,
    deleteCueSheetEvent,
    saveCueSheetChecklist,
    saveCueSheetEvent,
    saveCueSheetTracks,
    type CreateBlankChecklistInput,
    type CreateBlankEventInput,
    type CreateChecklistInstanceOverrides,
    type CreateEventInstanceOverrides,
} from '@/data/mutate-cue-sheet'
import { useWorkspace } from '@/lib/workspace-context'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

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
        createEventInstance: (template: CueSheetEvent, overrides?: CreateEventInstanceOverrides) => Promise<CueSheetEvent>
        createBlankEvent: (input: CreateBlankEventInput) => Promise<CueSheetEvent>
        createChecklistInstance: (template: Checklist, overrides?: CreateChecklistInstanceOverrides) => Promise<Checklist>
        createBlankChecklist: (input: CreateBlankChecklistInput) => Promise<Checklist>
        removeEvent: (id: string) => Promise<void>
        removeChecklist: (id: string) => Promise<void>
    }
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

    const { currentWorkspaceId } = useWorkspace()
    useEffect(() => {
        eventsLoadedRef.current = false
        checklistsLoadedRef.current = false
        setEventsById({})
        setChecklists([])
        setTracksByEventId({})
    }, [currentWorkspaceId])

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
        const previousChecklists = checklists

        setChecklists((prev) => {
            const idx = prev.findIndex((c) => c.id === checklist.id)
            if (idx === -1) return [...prev, checklist]
            return prev.map((c) => (c.id === checklist.id ? checklist : c))
        })

        try {
            const savedChecklist = await saveCueSheetChecklist(checklist)
            setChecklists((prev) => {
                const idx = prev.findIndex((c) => c.id === savedChecklist.id)
                if (idx === -1) return [...prev, savedChecklist]
                return prev.map((c) => (c.id === savedChecklist.id ? savedChecklist : c))
            })
        } catch (error) {
            setChecklists(previousChecklists)
            throw error
        }
    }, [checklists])

    const syncEvent = useCallback(async (event: CueSheetEvent) => {
        const savedEvent = await saveCueSheetEvent(event)
        setEventsById((prev) => ({ ...prev, [savedEvent.id]: savedEvent }))
    }, [])

    const syncTracks = useCallback(async (eventId: string, tracks: Track[]) => {
        const event = eventsById[eventId]

        if (!event) {
            return
        }

        const savedTracks = await saveCueSheetTracks({ id: event.id, kind: event.kind }, tracks)
        setTracksByEventId((prev) => ({ ...prev, [eventId]: savedTracks }))
    }, [eventsById])

    const createEventInstance = useCallback(async (template: CueSheetEvent, overrides?: CreateEventInstanceOverrides) => {
        const savedEvent = await createCueSheetEventInstance(template, overrides)
        const savedTracks = await fetchCueSheetTracksByEventId(savedEvent.id)
        setEventsById((prev) => ({ ...prev, [savedEvent.id]: savedEvent }))
        setTracksByEventId((prev) => ({ ...prev, [savedEvent.id]: savedTracks }))
        return savedEvent
    }, [])

    const createBlankEvent = useCallback(async (input: CreateBlankEventInput) => {
        const savedEvent = await createCueSheetBlankEvent(input)
        setEventsById((prev) => ({ ...prev, [savedEvent.id]: savedEvent }))
        setTracksByEventId((prev) => ({ ...prev, [savedEvent.id]: [] }))
        return savedEvent
    }, [])

    const createChecklistInstance = useCallback(async (template: Checklist, overrides?: CreateChecklistInstanceOverrides) => {
        const savedChecklist = await createCueSheetChecklistInstance(template, overrides)
        setChecklists((prev) => [...prev, savedChecklist])
        return savedChecklist
    }, [])

    const createBlankChecklist = useCallback(async (input: CreateBlankChecklistInput) => {
        const savedChecklist = await createCueSheetBlankChecklist(input)
        setChecklists((prev) => [...prev, savedChecklist])
        return savedChecklist
    }, [])

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
            createBlankEvent,
            createChecklistInstance,
            createBlankChecklist,
            removeEvent,
            removeChecklist,
        },
    }), [events, checklists, eventsById, tracksByEventId, isLoadingEvents, isLoadingChecklists, loadEvents, loadChecklists, loadEvent, syncChecklist, syncEvent, syncTracks, createEventInstance, createBlankEvent, createChecklistInstance, createBlankChecklist, removeEvent, removeChecklist])

    return <CueSheetContext.Provider value={value}>{children}</CueSheetContext.Provider>
}

export function useCueSheet() {
    const context = useContext(CueSheetContext)

    if (!context) {
        throw new Error('useCueSheet must be used within a CueSheetProvider')
    }

    return context
}
