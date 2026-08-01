import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchEquipment } from '@/data/fetch-equipment'
import { fetchRequests } from '@/data/fetch-requests'
import { fetchStreams } from '@/data/fetch-streams'
import { routes } from '@/screens/console-routes'
import type { Equipment } from '@moc/types/equipment'
import type { Request } from '@moc/types/requests'
import type { Stream } from '@moc/types/streams'

export type SearchResultKind = 'dashboard' | 'request' | 'equipment' | 'booking' | 'stream'

export type SearchResult = {
    id: string
    label: string
    description?: string
    route: string
    group: string
    kind: SearchResultKind
}

export type SearchResultGroup = {
    label: string
    results: SearchResult[]
}

const pageResults: SearchResult[] = [
    { id: routes.dashboard, group: 'General', label: 'Dashboard', route: `/${routes.dashboard}`, kind: 'dashboard' },
    { id: routes.requests, group: 'Requests', label: 'Requests', route: `/${routes.requests}`, kind: 'request' },
    { id: routes.equipment, group: 'Equipment', label: 'Equipment', route: `/${routes.equipment}`, kind: 'equipment' },
    { id: routes.bookings, group: 'Bookings', label: 'Bookings', route: `/${routes.bookings}`, kind: 'booking' },
    { id: routes.streams, group: 'Streams', label: 'Streams', route: `/${routes.streams}`, kind: 'stream' },
]

function groupResults(results: SearchResult[], suffix = ''): SearchResultGroup[] {
    const groups = new Map<string, SearchResult[]>()
    for (const result of results) groups.set(result.group, [...(groups.get(result.group) ?? []), result])
    return Array.from(groups, ([label, groupedResults]) => ({ label: `${label}${suffix}`, results: groupedResults }))
}

function toItemResults(requests: Request[], equipment: Equipment[], streams: Stream[]): SearchResult[] {
    return [
        ...requests.map((request) => ({ id: request.id, label: request.title, description: request.what, route: `/${routes.requestsDetail.replace(':id', request.id)}`, group: 'Requests', kind: 'request' as const })),
        ...equipment.map((item) => ({ id: item.id, label: item.name, description: item.location, route: `/${routes.equipmentDetail.replace(':id', item.id)}`, group: 'Equipment', kind: 'equipment' as const })),
        ...streams.map((stream) => ({ id: stream.id, label: stream.title, description: stream.description, route: `/${routes.streamDetail.replace(':id', stream.id)}`, group: 'Streams', kind: 'stream' as const })),
    ]
}

export function useSearchCommand(isOpen: boolean, search: string) {
    const navigate = useNavigate()
    const [items, setItems] = useState<SearchResult[]>([])
    const loadedRef = useRef(false)

    useEffect(() => {
        if (!isOpen || loadedRef.current) return
        loadedRef.current = true
        let cancelled = false

        async function loadItems() {
            const [requests, equipment, streams] = await Promise.all([
                fetchRequests().catch(() => [] as Request[]),
                fetchEquipment().catch(() => [] as Equipment[]),
                fetchStreams().catch(() => [] as Stream[]),
            ])
            if (!cancelled) setItems(toItemResults(requests, equipment, streams))
        }

        void loadItems()
        return () => { cancelled = true }
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) loadedRef.current = false
    }, [isOpen])

    const state = useMemo(() => {
        const query = search.trim().toLowerCase()
        const filteredPages = query ? pageResults.filter((page) => page.label.toLowerCase().includes(query) || page.group.toLowerCase().includes(query)) : pageResults
        const filteredItems = query ? items.filter((item) => item.label.toLowerCase().includes(query) || item.description?.toLowerCase().includes(query)).slice(0, 10) : []

        return {
            groups: [...groupResults(filteredItems), ...groupResults(filteredPages, query ? ' pages' : '')],
            hasResults: filteredPages.length > 0 || filteredItems.length > 0,
        }
    }, [items, search])

    function selectResult(result: SearchResult) {
        navigate(result.route)
    }

    return { state, actions: { selectResult } }
}
