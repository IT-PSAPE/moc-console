import type { CueSheetEvent, Checklist, Track } from '@/types/cue-sheet'
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

// ─── Mock Data ──────────────────────────────────────────────────────

const MOCK_EVENTS: CueSheetEvent[] = [
    {
        id: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890',
        title: 'Sunday Service',
        description: 'Standard Sunday morning service template',
        duration: 120,
        createdAt: '2026-03-01T08:00:00Z',
        updatedAt: '2026-03-28T10:00:00Z',
    },
    {
        id: 'b2c3d4e5-f6a7-4901-bcde-f12345678901',
        title: 'Wednesday Bible Study',
        description: 'Midweek Bible study session',
        duration: 90,
        createdAt: '2026-03-05T08:00:00Z',
        updatedAt: '2026-03-26T10:00:00Z',
    },
    {
        id: 'c3d4e5f6-a7b8-4012-cdef-123456789012',
        title: 'Youth Night',
        description: 'Friday youth gathering template',
        duration: 150,
        createdAt: '2026-03-10T08:00:00Z',
        updatedAt: '2026-03-30T10:00:00Z',
    },
]

const MOCK_CHECKLISTS: Checklist[] = [
    {
        id: 'd4e5f6a7-b8c9-4123-def0-234567890123',
        name: 'Sunday Service Prep',
        description: 'Pre-service preparation checklist',
        items: [
            { id: 'e5f6a7b8-c9d0-4234-ef01-345678901234', label: 'Venue unlocked and lights on', checked: false },
            { id: 'f6a7b8c9-d0e1-4345-f012-456789012345', label: 'Communion elements prepared', checked: false },
        ],
        sections: [
            {
                id: '01a2b3c4-d5e6-4456-0123-567890123456',
                name: 'Audio Team',
                items: [
                    { id: '12b3c4d5-e6f7-4567-1234-678901234567', label: 'Sound check completed', checked: false },
                    { id: '23c4d5e6-f7a8-4678-2345-789012345678', label: 'Microphone batteries replaced', checked: false },
                    { id: '34d5e6f7-a8b9-4789-3456-890123456789', label: 'Audio mixer levels set', checked: false },
                ],
            },
            {
                id: '45e6f7a8-b9c0-4890-4567-901234567890',
                name: 'Visuals & Streaming',
                items: [
                    { id: '56f7a8b9-c0d1-4901-5678-012345678901', label: 'Projector slides loaded', checked: false },
                    { id: '67a8b9c0-d1e2-4012-6789-123456789012', label: 'Livestream tested', checked: false },
                    { id: '78b9c0d1-e2f3-4123-7890-234567890123', label: 'Recording software running', checked: false },
                ],
            },
            {
                id: '89c0d1e2-f3a4-4234-8901-345678901234',
                name: 'Welcome Team',
                items: [
                    { id: '90d1e2f3-a4b5-4345-9012-456789012345', label: 'Welcome team briefed', checked: false },
                    { id: 'a1e2f3a4-b5c6-4456-a123-567890123456', label: 'Bulletins printed and ready', checked: false },
                ],
            },
        ],
        createdAt: '2026-03-01T07:00:00Z',
        updatedAt: '2026-03-28T07:00:00Z',
    },
    {
        id: 'b2f3a4b5-c6d7-4567-b234-678901234567',
        name: 'Media Setup',
        description: 'Equipment and media readiness check',
        items: [
            { id: 'c3a4b5c6-d7e8-4678-c345-789012345678', label: 'Cameras powered on', checked: false },
            { id: 'd4b5c6d7-e8f9-4789-d456-890123456789', label: 'Audio mixer levels set', checked: false },
            { id: 'e5c6d7e8-f9a0-4890-e567-901234567890', label: 'Recording software running', checked: false },
        ],
        sections: [],
        createdAt: '2026-03-02T07:00:00Z',
        updatedAt: '2026-03-29T07:00:00Z',
    },
    {
        id: 'f6d7e8f9-a0b1-4901-f678-012345678901',
        name: 'Youth Night Prep',
        description: 'Youth event preparation',
        items: [
            { id: 'a7e8f9a0-b1c2-4012-a789-123456789012', label: 'Venue setup complete', checked: false },
        ],
        sections: [
            {
                id: 'b8f9a0b1-c2d3-4123-b890-234567890123',
                name: 'Praise & Worship',
                items: [
                    { id: 'c9a0b1c2-d3e4-4234-c901-345678901234', label: 'Worship team rehearsed', checked: false },
                    { id: 'd0b1c2d3-e4f5-4345-d012-456789012345', label: 'Lyrics loaded on screens', checked: false },
                ],
            },
            {
                id: 'e1c2d3e4-f5a6-4456-e123-567890123456',
                name: 'Activities',
                items: [
                    { id: 'f2d3e4f5-a6b7-4567-f234-678901234567', label: 'Games equipment ready', checked: false },
                    { id: 'a3e4f5a6-b7c8-4678-a345-789012345678', label: 'Snacks and drinks set up', checked: false },
                    { id: 'b4f5a6b7-c8d9-4789-b456-890123456789', label: 'Small group materials printed', checked: false },
                ],
            },
        ],
        createdAt: '2026-03-10T07:00:00Z',
        updatedAt: '2026-03-30T07:00:00Z',
    },
]

const MOCK_TRACKS: Record<string, Track[]> = {
    'a1b2c3d4-e5f6-4890-abcd-ef1234567890': [
        {
            id: 'c5a6b7c8-d9e0-4890-c567-901234567890',
            name: 'Audio',
            cues: [
                { id: 'd6b7c8d9-e0f1-4901-d678-012345678901', label: 'Pre-service music', startMin: 0, durationMin: 15, color: 'var(--color-utility-blue-500)' },
                { id: 'e7c8d9e0-f1a2-4012-e789-123456789012', label: 'Worship set', startMin: 15, durationMin: 30, color: 'var(--color-utility-blue-500)' },
                { id: 'f8d9e0f1-a2b3-4123-f890-234567890123', label: 'Sermon audio', startMin: 50, durationMin: 40, color: 'var(--color-utility-blue-500)' },
                { id: 'a9e0f1a2-b3c4-4234-a901-345678901234', label: 'Closing music', startMin: 100, durationMin: 20, color: 'var(--color-utility-blue-500)' },
            ],
        },
        {
            id: 'b0f1a2b3-c4d5-4345-b012-456789012345',
            name: 'Visuals',
            cues: [
                { id: 'c1a2b3c4-d5e6-4456-c123-567890123456', label: 'Welcome slides', startMin: 0, durationMin: 15, color: 'var(--color-utility-purple-500)' },
                { id: 'd2b3c4d5-e6f7-4567-d234-678901234567', label: 'Worship lyrics', startMin: 15, durationMin: 30, color: 'var(--color-utility-purple-500)' },
                { id: 'e3c4d5e6-f7a8-4678-e345-789012345678', label: 'Sermon slides', startMin: 50, durationMin: 40, color: 'var(--color-utility-purple-500)' },
                { id: 'f4d5e6f7-a8b9-4789-f456-890123456789', label: 'Announcements', startMin: 90, durationMin: 10, color: 'var(--color-utility-purple-500)' },
            ],
        },
        {
            id: 'a5e6f7a8-b9c0-4890-a567-901234567890',
            name: 'Livestream',
            cues: [
                { id: 'b6f7a8b9-c0d1-4901-b678-012345678901', label: 'Go live', startMin: 10, durationMin: 5, color: 'var(--color-utility-red-500)' },
                { id: 'c7a8b9c0-d1e2-4012-c789-123456789012', label: 'Main broadcast', startMin: 15, durationMin: 95, color: 'var(--color-utility-red-500)' },
                { id: 'd8b9c0d1-e2f3-4123-d890-234567890123', label: 'End stream', startMin: 110, durationMin: 10, color: 'var(--color-utility-red-500)' },
            ],
        },
    ],
    'b2c3d4e5-f6a7-4901-bcde-f12345678901': [
        {
            id: 'e9c0d1e2-f3a4-4234-e901-345678901234',
            name: 'Audio',
            cues: [
                { id: 'f0d1e2f3-a4b5-4345-f012-456789012345', label: 'Background music', startMin: 0, durationMin: 10, color: 'var(--color-utility-blue-500)' },
                { id: 'a1e2f3a4-b5c6-4456-a123-567890123457', label: 'Teaching audio', startMin: 10, durationMin: 60, color: 'var(--color-utility-blue-500)' },
                { id: 'b2f3a4b5-c6d7-4567-b234-678901234568', label: 'Discussion', startMin: 70, durationMin: 20, color: 'var(--color-utility-blue-500)' },
            ],
        },
        {
            id: 'c3a4b5c6-d7e8-4678-c345-789012345679',
            name: 'Visuals',
            cues: [
                { id: 'd4b5c6d7-e8f9-4789-d456-890123456790', label: 'Study slides', startMin: 10, durationMin: 60, color: 'var(--color-utility-purple-500)' },
                { id: 'e5c6d7e8-f9a0-4890-e567-901234567891', label: 'Discussion prompts', startMin: 70, durationMin: 20, color: 'var(--color-utility-purple-500)' },
            ],
        },
    ],
    'c3d4e5f6-a7b8-4012-cdef-123456789012': [
        {
            id: 'f6d7e8f9-a0b1-4901-f678-012345678902',
            name: 'Stage',
            cues: [
                { id: 'a7e8f9a0-b1c2-4012-a789-123456789013', label: 'Games', startMin: 0, durationMin: 30, color: 'var(--color-utility-green-500)' },
                { id: 'b8f9a0b1-c2d3-4123-b890-234567890124', label: 'Worship', startMin: 30, durationMin: 30, color: 'var(--color-utility-green-500)' },
                { id: 'c9a0b1c2-d3e4-4234-c901-345678901235', label: 'Message', startMin: 60, durationMin: 30, color: 'var(--color-utility-green-500)' },
                { id: 'd0b1c2d3-e4f5-4345-d012-456789012346', label: 'Small groups', startMin: 90, durationMin: 40, color: 'var(--color-utility-green-500)' },
                { id: 'e1c2d3e4-f5a6-4456-e123-567890123457', label: 'Hangout', startMin: 130, durationMin: 20, color: 'var(--color-utility-green-500)' },
            ],
        },
        {
            id: 'f2d3e4f5-a6b7-4567-f234-678901234568',
            name: 'Media',
            cues: [
                { id: 'a3e4f5a6-b7c8-4678-a345-789012345679', label: 'Game visuals', startMin: 0, durationMin: 30, color: 'var(--color-utility-orange-500)' },
                { id: 'b4f5a6b7-c8d9-4789-b456-890123456790', label: 'Lyrics', startMin: 30, durationMin: 30, color: 'var(--color-utility-orange-500)' },
                { id: 'c5a6b7c8-d9e0-4890-c567-901234567891', label: 'Sermon slides', startMin: 60, durationMin: 30, color: 'var(--color-utility-orange-500)' },
            ],
        },
    ],
}

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
        syncChecklist: (checklist: Checklist) => void
        syncEvent: (event: CueSheetEvent) => void
        syncTracks: (eventId: string, tracks: Track[]) => void
        removeEvent: (id: string) => void
        removeChecklist: (id: string) => void
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

    const loadEvents = useCallback(async () => {
        if (eventsLoadedRef.current) return
        if (eventsPromiseRef.current) return eventsPromiseRef.current

        setIsLoadingEvents(true)
        eventsPromiseRef.current = Promise.resolve(MOCK_EVENTS)
            .then((events) => {
                const byId: Record<string, CueSheetEvent> = {}
                for (const event of events) byId[event.id] = event
                setEventsById(byId)
                setTracksByEventId(MOCK_TRACKS)
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
        checklistsPromiseRef.current = Promise.resolve(MOCK_CHECKLISTS)
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
        if (eventsById[id]) return
        const event = MOCK_EVENTS.find((e) => e.id === id)
        if (!event) return
        setEventsById((prev) => ({ ...prev, [event.id]: event }))
        if (MOCK_TRACKS[id]) {
            setTracksByEventId((prev) => ({ ...prev, [id]: MOCK_TRACKS[id] }))
        }
    }, [eventsById])

    const syncChecklist = useCallback((checklist: Checklist) => {
        setChecklists((prev) => {
            const idx = prev.findIndex((c) => c.id === checklist.id)
            if (idx === -1) return [...prev, checklist]
            return prev.map((c) => (c.id === checklist.id ? checklist : c))
        })
    }, [])

    const syncEvent = useCallback((event: CueSheetEvent) => {
        setEventsById((prev) => ({ ...prev, [event.id]: event }))
    }, [])

    const syncTracks = useCallback((eventId: string, tracks: Track[]) => {
        setTracksByEventId((prev) => ({ ...prev, [eventId]: tracks }))
    }, [])

    const removeEvent = useCallback((id: string) => {
        setEventsById((prev) => {
            const next = { ...prev }
            delete next[id]
            return next
        })
    }, [])

    const removeChecklist = useCallback((id: string) => {
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
            removeEvent,
            removeChecklist,
        },
    }), [events, checklists, eventsById, tracksByEventId, isLoadingEvents, isLoadingChecklists, loadEvents, loadChecklists, loadEvent, syncChecklist, syncEvent, syncTracks, removeEvent, removeChecklist])

    return <CueSheetContext.Provider value={value}>{children}</CueSheetContext.Provider>
}

export function useCueSheet() {
    const context = useContext(CueSheetContext)

    if (!context) {
        throw new Error('useCueSheet must be used within a CueSheetProvider')
    }

    return context
}
