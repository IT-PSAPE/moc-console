import { fetchArchivedRequests, fetchRequests } from '@/data/fetch-requests'
import { fetchRequestCategories } from '@/data/fetch-request-categories'
import { createRequestCategory, setRequestCategoryActive, updateRequestCategory } from '@/data/mutate-request-categories'
import { queryClient } from "@/lib/query-client"
import { setWorkspaceDetailData, workspaceResourceKey } from "@/data/workspace-resource-cache"
import { getCurrentWorkspaceGeneration } from "@/data/current-workspace"
import { useWorkspaceResource } from '@/hooks/use-workspace-resource'
import { useWorkspace } from '@/lib/workspace-context'
import type { Request, RequestCategoryDefinition } from '@moc/types/requests'
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'

type RequestsContextValue = {
    state: {
        allRequests: Request[]
        activeRequests: Request[]
        archivedRequests: Request[]
        requestsById: Record<string, Request>
        requestCategories: RequestCategoryDefinition[]
        isLoadingActive: boolean
        isInitialLoadingActive: boolean
        isLoadingArchived: boolean
        isInitialLoadingArchived: boolean
        isLoadingCategories: boolean
        isInitialLoadingCategories: boolean
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
        retryCategories: () => Promise<void>
        syncRequest: (request: Request) => void
        removeRequest: (id: string) => void
        createRequestType: (name: string) => Promise<RequestCategoryDefinition>
        renameRequestType: (category: RequestCategoryDefinition, name: string) => Promise<RequestCategoryDefinition>
        setRequestTypeActive: (category: RequestCategoryDefinition, active: boolean) => Promise<RequestCategoryDefinition>
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

function renameRequestCategoryLabels(requests: Request[], key: string, name: string) {
    return requests.map((request) => request.category === key ? { ...request, categoryName: name } : request)
}

export function RequestsProvider({ children }: { children: ReactNode }) {
    const { currentWorkspaceId } = useWorkspace()
    const { data: activeData, error: activeError, isLoading: isLoadingActive, isInitialLoading: isInitialLoadingActive, load: loadActiveResource, updateData: updateActive } = useWorkspaceResource({ deferInitialLoad: true, emptyValue: emptyRequests, fetcher: fetchRequests, resource: 'requests:active', workspaceId: currentWorkspaceId })
    const { data: archivedData, error: archivedError, isLoading: isLoadingArchived, isInitialLoading: isInitialLoadingArchived, load: loadArchivedResource, updateData: updateArchived } = useWorkspaceResource({ deferInitialLoad: true, emptyValue: emptyRequests, fetcher: fetchArchivedRequests, resource: 'requests:archived', workspaceId: currentWorkspaceId })
    const { data: requestCategories, error: categoriesError, isLoading: isLoadingCategories, isInitialLoading: isInitialLoadingCategories, load: loadCategoriesResource, updateData: updateCategories } = useWorkspaceResource({ emptyValue: emptyCategories, fetcher: fetchRequestCategories, resource: 'request-categories', workspaceId: currentWorkspaceId })
    const generation = getCurrentWorkspaceGeneration()
    const requestsById = useMemo(() => mergeRequests(mergeRequests({}, activeData), archivedData), [activeData, archivedData])

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

    const retryCategories = useCallback(async () => {
        await loadCategoriesResource(true)
    }, [loadCategoriesResource])

    const syncRequest = useCallback((request: Request) => {
        if (!currentWorkspaceId || generation !== getCurrentWorkspaceGeneration()) return
        setWorkspaceDetailData(currentWorkspaceId, 'requests', request.id, request)
        updateActive((requests) => syncIntoRequests(requests, request, request.status !== 'archived'))
        updateArchived((requests) => syncIntoRequests(requests, request, request.status === 'archived'))
    }, [currentWorkspaceId, generation, updateActive, updateArchived])

    const removeRequest = useCallback((id: string) => {
        if (!currentWorkspaceId || generation !== getCurrentWorkspaceGeneration()) return
        setWorkspaceDetailData(currentWorkspaceId, 'requests', id, null)
        updateActive((requests) => removeFromRequests(requests, id))
        updateArchived((requests) => removeFromRequests(requests, id))
    }, [currentWorkspaceId, generation, updateActive, updateArchived])

    const createRequestType = useCallback(async (name: string) => {
        if (!currentWorkspaceId) throw new Error('Choose a workspace before creating a request type.')
        const created = await createRequestCategory({ name, description: null }, currentWorkspaceId)
        updateCategories((categories) => [...categories, created])
        return created
    }, [currentWorkspaceId, updateCategories])

    const renameRequestType = useCallback(async (category: RequestCategoryDefinition, name: string) => {
        if (!currentWorkspaceId) throw new Error('Choose a workspace before renaming a request type.')
        const updated = await updateRequestCategory(category.id, { name }, currentWorkspaceId)
        updateCategories((categories) => categories.map((item) => item.id === updated.id ? updated : item))
        updateActive((requests) => renameRequestCategoryLabels(requests, updated.key, updated.name))
        updateArchived((requests) => renameRequestCategoryLabels(requests, updated.key, updated.name))
        if (generation === getCurrentWorkspaceGeneration()) {
            const queryKey = [...workspaceResourceKey(currentWorkspaceId, 'requests'), 'detail']
            void queryClient.cancelQueries({ queryKey })
            queryClient.setQueriesData<Request | null>({ queryKey }, (request) => request?.category === updated.key ? { ...request, categoryName: updated.name } : request)
            void queryClient.invalidateQueries({ queryKey })
        }
        return updated
    }, [currentWorkspaceId, generation, updateActive, updateArchived, updateCategories])

    const setRequestTypeActive = useCallback(async (category: RequestCategoryDefinition, active: boolean) => {
        if (!currentWorkspaceId) throw new Error('Choose a workspace before changing a request type.')
        await setRequestCategoryActive(category.id, active, currentWorkspaceId)
        const updated = { ...category, active }
        updateCategories((categories) => categories.map((item) => item.id === updated.id ? updated : item))
        return updated
    }, [currentWorkspaceId, updateCategories])

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
            isInitialLoadingActive,
            isInitialLoadingArchived,
            isInitialLoadingCategories,
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
            retryCategories,
            syncRequest,
            removeRequest,
            createRequestType,
            renameRequestType,
            setRequestTypeActive,
        },
    }), [activeError, activeRequests, allRequests, archivedError, archivedRequests, categoriesError, createRequestType, isInitialLoadingActive, isInitialLoadingArchived, isInitialLoadingCategories, isLoadingActive, isLoadingArchived, isLoadingCategories, loadActiveRequests, loadArchivedRequests, loadCategories, requestCategories, requestsById, retryActiveRequests, retryArchivedRequests, retryCategories, removeRequest, renameRequestType, setRequestTypeActive, syncRequest])

    return <RequestsContext.Provider value={value}>{children}</RequestsContext.Provider>
}

export function useRequests() {
    const context = useContext(RequestsContext)

    if (!context) {
        throw new Error('useRequests must be used within a RequestsProvider')
    }

    return context
}
