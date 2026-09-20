import { fetchArchivedRequests, fetchRequestById, fetchRequests } from '@/data/fetch-requests'
import { fetchRequestCategories } from '@/data/fetch-request-categories'
import { useWorkspaceResource } from '@/hooks/use-workspace-resource'
import { useWorkspace } from '@/lib/workspace-context'
import type { Request, RequestCategoryDefinition } from '@moc/types/requests'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type RequestsContextValue = {
    state: {
        allRequests: Request[]
        activeRequests: Request[]
        archivedRequests: Request[]
        requestsById: Record<string, Request>
        requestCategories: RequestCategoryDefinition[]
        isLoadingActive: boolean
        isLoadingArchived: boolean
        isLoadingCategories: boolean
        activeError: Error | null
        archivedError: Error | null
        categoriesError: Error | null
    }
    actions: {
        loadActiveRequests: () => Promise<void>
        loadArchivedRequests: () => Promise<void>
        loadCategories: () => Promise<void>
        retryActiveRequests: () => Promise<void>
        retryArchivedRequests: () => Promise<void>
        loadRequest: (id: string) => Promise<void>
        syncRequest: (request: Request) => void
        removeRequest: (id: string) => void
    }
}

const RequestsContext = createContext<RequestsContextValue | null>(null)
const emptyRequests: Request[] = []
const emptyCategories: RequestCategoryDefinition[] = []

function mergeRequests(previous: Record<string, Request>, requests: Request[]) {
    const next = { ...previous }

    for (const request of requests) {
        next[request.id] = request
    }

    return next
}

function removeFromRequests(requests: Request[], id: string) {
    return requests.filter((request) => request.id !== id)
}

function syncIntoRequests(requests: Request[], request: Request, include: boolean) {
    const exists = requests.some((entry) => entry.id === request.id)
    if (!include) return removeFromRequests(requests, request.id)
    if (!exists) return [request, ...requests]
    return requests.map((entry) => entry.id === request.id ? request : entry)
}

export function RequestsProvider({ children }: { children: ReactNode }) {
    const { currentWorkspaceId } = useWorkspace()
    const { data: activeData, error: activeError, isLoading: isLoadingActive, load: loadActiveResource, updateData: updateActive } = useWorkspaceResource({ emptyValue: emptyRequests, fetcher: fetchRequests, resource: 'requests:active', workspaceId: currentWorkspaceId })
    const { data: archivedData, error: archivedError, isLoading: isLoadingArchived, load: loadArchivedResource, updateData: updateArchived } = useWorkspaceResource({ emptyValue: emptyRequests, fetcher: fetchArchivedRequests, resource: 'requests:archived', workspaceId: currentWorkspaceId })
    const { data: requestCategories, error: categoriesError, isLoading: isLoadingCategories, load: loadCategoriesResource } = useWorkspaceResource({ emptyValue: emptyCategories, fetcher: fetchRequestCategories, resource: 'request-categories', workspaceId: currentWorkspaceId })
    const [detailRequestsByWorkspace, setDetailRequestsByWorkspace] = useState<Record<string, Record<string, Request>>>({})
    const requestsById = useMemo(() => {
        const detailRequests = currentWorkspaceId ? detailRequestsByWorkspace[currentWorkspaceId] ?? {} : {}
        return { ...mergeRequests(mergeRequests({}, activeData), archivedData), ...detailRequests }
    }, [activeData, archivedData, currentWorkspaceId, detailRequestsByWorkspace])

    const loadActiveRequests = useCallback(async () => {
        await Promise.all([loadActiveResource(), loadCategoriesResource()])
    }, [loadActiveResource, loadCategoriesResource])

    const loadArchivedRequests = useCallback(async () => {
        await loadArchivedResource()
    }, [loadArchivedResource])

    const loadCategories = useCallback(async () => {
        await loadCategoriesResource()
    }, [loadCategoriesResource])

    const retryActiveRequests = useCallback(async () => {
        await loadActiveResource(true)
    }, [loadActiveResource])

    const retryArchivedRequests = useCallback(async () => {
        await loadArchivedResource(true)
    }, [loadArchivedResource])

    const syncRequest = useCallback((request: Request) => {
        if (currentWorkspaceId) {
            setDetailRequestsByWorkspace((previous) => ({
                ...previous,
                [currentWorkspaceId]: { ...(previous[currentWorkspaceId] ?? {}), [request.id]: request },
            }))
        }
        updateActive((requests) => syncIntoRequests(requests, request, request.status !== 'archived'))
        updateArchived((requests) => syncIntoRequests(requests, request, request.status === 'archived'))
    }, [currentWorkspaceId, updateActive, updateArchived])

    const removeRequest = useCallback((id: string) => {
        if (currentWorkspaceId) {
            setDetailRequestsByWorkspace((previous) => {
                const nextWorkspaceRequests = { ...(previous[currentWorkspaceId] ?? {}) }
                delete nextWorkspaceRequests[id]
                return { ...previous, [currentWorkspaceId]: nextWorkspaceRequests }
            })
        }
        updateActive((requests) => removeFromRequests(requests, id))
        updateArchived((requests) => removeFromRequests(requests, id))
    }, [currentWorkspaceId, updateActive, updateArchived])

    const loadRequest = useCallback(async (id: string) => {
        if (!currentWorkspaceId) return
        await loadCategoriesResource()
        if (requestsById[id]) return

        const request = await fetchRequestById(id, currentWorkspaceId)
        if (!request) return
        setDetailRequestsByWorkspace((previous) => ({
            ...previous,
            [currentWorkspaceId]: { ...(previous[currentWorkspaceId] ?? {}), [request.id]: request },
        }))
    }, [currentWorkspaceId, loadCategoriesResource, requestsById])

    const allRequests = useMemo(() => Object.values(requestsById), [requestsById])
    const activeRequests = useMemo(() => allRequests.filter((request) => request.status !== 'archived'), [allRequests])
    const archivedRequests = useMemo(() => allRequests.filter((request) => request.status === 'archived'), [allRequests])

    const value = useMemo<RequestsContextValue>(() => ({
        state: {
            allRequests,
            activeRequests,
            archivedRequests,
            requestsById,
            requestCategories,
            isLoadingActive,
            isLoadingArchived,
            isLoadingCategories,
            activeError,
            archivedError,
            categoriesError,
        },
        actions: {
            loadActiveRequests,
            loadArchivedRequests,
            loadCategories,
            retryActiveRequests,
            retryArchivedRequests,
            loadRequest,
            syncRequest,
            removeRequest,
        },
    }), [activeError, activeRequests, allRequests, archivedError, archivedRequests, categoriesError, isLoadingActive, isLoadingArchived, isLoadingCategories, loadActiveRequests, loadArchivedRequests, loadCategories, loadRequest, requestCategories, requestsById, retryActiveRequests, retryArchivedRequests, removeRequest, syncRequest])

    return <RequestsContext.Provider value={value}>{children}</RequestsContext.Provider>
}

export function useRequests() {
    const context = useContext(RequestsContext)

    if (!context) {
        throw new Error('useRequests must be used within a RequestsProvider')
    }

    return context
}
