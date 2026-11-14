import { getCurrentWorkspaceGeneration } from '@/data/current-workspace'
import { useIsFetching, useQueryClient, type QueryFilters } from '@tanstack/react-query'
import { useCallback, useMemo, useSyncExternalStore } from 'react'

export function useWorkspaceRefreshRecovery(workspaceId: string | null) {
  const queryClient = useQueryClient()
  const cache = queryClient.getQueryCache()
  const generation = getCurrentWorkspaceGeneration()
  const filters = useMemo<QueryFilters>(() => ({
    queryKey: ['workspace', workspaceId],
    type: 'active',
    predicate: query => Boolean(workspaceId) && query.state.data !== undefined && query.state.error !== null,
  }), [workspaceId])
  const subscribe = useCallback((onChange: () => void): (() => void) => cache.subscribe(onChange), [cache])
  const readFailureCount = useCallback((): number => cache.findAll(filters).length, [cache, filters])
  const failureCount = useSyncExternalStore(subscribe, readFailureCount, readFailureCount)
  const retryingCount = useIsFetching(filters)

  const retry = useCallback(async (): Promise<void> => {
    if (!workspaceId || generation !== getCurrentWorkspaceGeneration()) return
    await queryClient.refetchQueries(filters)
  }, [filters, generation, queryClient, workspaceId])

  return {
    state: { hasRefreshError: failureCount > 0, isRetrying: retryingCount > 0 },
    actions: { retry },
  }
}
