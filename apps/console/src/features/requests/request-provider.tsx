import { fetchArchivedRequests, fetchRequestById, fetchRequests } from '@/data/fetch-requests'
import type { Request } from '@/types/requests'
import { useWorkspace } from '@/lib/workspace-context'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

type RequestsContextValue = {
    state: {
        activeRequests: Request[]
        archivedRequests: Request[]
        requestsById: Record<string, Request>
        isLoadingActive: boolean
        isLoadingArchived: boolean
    }
    actions: {
        loadActiveRequests: () => Promise<void>
        loadArchivedRequests: () => Promise<void>
        loadRequest: (id: string) => Promise<void>
        syncRequest: (request: Request) => void
        removeRequest: (id: string) => void
    }
}

const RequestsContext = createContext<RequestsContextValue | null>(null)

function mergeRequests(previous: Record<string, Request>, requests: Request[]) {
    const next = { ...previous }

    for (const request of requests) {
        next[request.id] = request
    }

    return next
}

export function RequestsProvider({ children }: { children: ReactNode }) {
    const [requestsById, setRequestsById] = useState<Record<string, Request>>({})
    const [isLoadingActive, setIsLoadingActive] = useState(false)
    const [isLoadingArchived, setIsLoadingArchived] = useState(false)
    const requestsByIdRef = useRef<Record<string, Request>>({})
    const activeLoadedRef = useRef(false)
    const archivedLoadedRef = useRef(false)
    const activePromiseRef = useRef<Promise<void> | null>(null)
    const archivedPromiseRef = useRef<Promise<void> | null>(null)

    useEffect(() => {
        requestsByIdRef.current = requestsById
    }, [requestsById])

    const { currentWorkspaceId } = useWorkspace()
    useEffect(() => {
        activeLoadedRef.current = false
        archivedLoadedRef.current = false
        setRequestsById({})
    }, [currentWorkspaceId])

    const syncRequest = useCallback((request: Request) => {
        setRequestsById((previous) => ({ ...previous, [request.id]: request }))
    }, [])

    const removeRequest = useCallback((id: string) => {
        setRequestsById((previous) => {
            const next = { ...previous }
            delete next[id]
            return next
        })
    }, [])

    const loadActiveRequests = useCallback(async () => {
        if (activeLoadedRef.current) return
        if (activePromiseRef.current) return activePromiseRef.current

        setIsLoadingActive(true)
        activePromiseRef.current = fetchRequests()
            .then((requests) => {
                setRequestsById((previous) => mergeRequests(previous, requests))
                activeLoadedRef.current = true
            })
            .finally(() => {
                activePromiseRef.current = null
                setIsLoadingActive(false)
            })

        return activePromiseRef.current
    }, [])

    const loadArchivedRequests = useCallback(async () => {
        if (archivedLoadedRef.current) return
        if (archivedPromiseRef.current) return archivedPromiseRef.current

        setIsLoadingArchived(true)
        archivedPromiseRef.current = fetchArchivedRequests()
            .then((requests) => {
                setRequestsById((previous) => mergeRequests(previous, requests))
                archivedLoadedRef.current = true
            })
            .finally(() => {
                archivedPromiseRef.current = null
                setIsLoadingArchived(false)
            })

        return archivedPromiseRef.current
    }, [])

    const loadRequest = useCallback(async (id: string) => {
        if (requestsByIdRef.current[id]) return

        const request = await fetchRequestById(id)
        if (!request) return

        setRequestsById((previous) => ({ ...previous, [request.id]: request }))
    }, [])

    const activeRequests = useMemo(() => Object.values(requestsById).filter((request) => request.status !== 'archived'), [requestsById])
    const archivedRequests = useMemo(() => Object.values(requestsById).filter((request) => request.status === 'archived'), [requestsById])

    const value = useMemo(() => ({
        state: {
            activeRequests,
            archivedRequests,
            requestsById,
            isLoadingActive,
            isLoadingArchived,
        },
        actions: {
            loadActiveRequests,
            loadArchivedRequests,
            loadRequest,
            syncRequest,
            removeRequest,
        },
    }), [activeRequests, archivedRequests, loadActiveRequests, loadArchivedRequests, loadRequest, requestsById, syncRequest, removeRequest, isLoadingActive, isLoadingArchived])

    return <RequestsContext.Provider value={value}>{children}</RequestsContext.Provider>
}

export function useRequests() {
    const context = useContext(RequestsContext)

    if (!context) {
        throw new Error('useRequests must be used within a RequestsProvider')
    }

    return context
}
