import { workspaceResourceKey } from "@/data/workspace-resource-cache"
import { useQuery, useQueryClient, type QueryState } from "@tanstack/react-query"
import { useCallback, useSyncExternalStore } from "react"
import { consoleQueryPolicy } from "@/lib/console-query-policy"

type WorkspaceDetailOptions<T> = {
  fetcher: (id: string, workspaceId: string) => Promise<T | undefined>
  id: string | undefined
  workspaceId: string | null
  resource: string
  collectionResource?: string
}

export function useWorkspaceDetail<T extends { id: string }>({ fetcher, id, workspaceId, resource, collectionResource = resource }: WorkspaceDetailOptions<T>) {
  const queryClient = useQueryClient()
  const readCollection = useCallback((): QueryState<readonly T[]> | undefined => queryClient.getQueryState(workspaceResourceKey(workspaceId, collectionResource)), [queryClient, workspaceId, collectionResource])
  const subscribeToCollection = useCallback((onChange: () => void): (() => void) => {
    return queryClient.getQueryCache().subscribe((event) => {
      const key = event.query.queryKey
      if (key.length === 3 && key[0] === 'workspace' && key[1] === workspaceId && key[2] === collectionResource) onChange()
    })
  }, [queryClient, workspaceId, collectionResource])
  const collection = useSyncExternalStore(subscribeToCollection, readCollection, readCollection)
  const initialData = id && workspaceId ? collection?.data?.find((item) => item.id === id) : undefined
  // Seeding must preserve the collection's age and explicit invalidations.
  const initialDataUpdatedAt = collection?.isInvalidated ? 0 : collection?.dataUpdatedAt
  const query = useQuery({
    ...consoleQueryPolicy(resource),
    queryKey: [...workspaceResourceKey(workspaceId, resource), "detail", id],
    queryFn: async () => {
      if (!id || !workspaceId) throw new Error("Select an item and workspace")
      return await fetcher(id, workspaceId) ?? null
    },
    enabled: Boolean(id && workspaceId),
    initialData,
    initialDataUpdatedAt,
  })
  const { refetch } = query
  const retry = useCallback(() => { void refetch() }, [refetch])
  const collectionIsNewer = initialData !== undefined && (collection?.dataUpdatedAt ?? 0) > query.dataUpdatedAt
  const data = collectionIsNewer ? initialData : query.data
  const hasData = data !== undefined
  return {
    data: data ?? null,
    error: hasData ? null : query.error,
    refreshError: hasData ? query.error : null,
    isLoading: Boolean(id && workspaceId) && !hasData && query.isPending,
    retry,
  }
}
