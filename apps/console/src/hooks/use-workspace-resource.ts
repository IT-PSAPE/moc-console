import { getCurrentWorkspaceGeneration } from "@/data/current-workspace"
import { getWorkspaceResourceState, invalidateWorkspaceResource, loadWorkspaceResource, setWorkspaceDetailData, setWorkspaceResourceData, updateWorkspaceResourceData, workspaceResourceKey } from "@/data/workspace-resource-cache"
import { useQuery } from "@tanstack/react-query"
import { consoleQueryPolicy } from "@/lib/console-query-policy"
import { useCallback } from "react"

type WorkspaceResourceOptions<T> = {
  emptyValue: T
  fetcher: (workspaceId: string) => Promise<T>
  resource: string
  workspaceId: string | null
  enabled?: boolean
  deferInitialLoad?: boolean
}

export function useWorkspaceResource<T>({ emptyValue, fetcher, resource, workspaceId, enabled = true, deferInitialLoad = false }: WorkspaceResourceOptions<T>) {
  const generation = getCurrentWorkspaceGeneration()
  const query = useQuery({
    ...consoleQueryPolicy(resource),
    queryKey: workspaceResourceKey(workspaceId, resource),
    queryFn: () => {
      if (!workspaceId) throw new Error("Select a workspace")
      return fetcher(workspaceId)
    },
    enabled: (current) => Boolean(workspaceId) && enabled && (!deferInitialLoad || current.state.data !== undefined),
    retryOnMount: false,
  })

  const load = useCallback(async (force = false): Promise<void> => {
    if (!workspaceId || getCurrentWorkspaceGeneration() !== generation) return
    try {
      await loadWorkspaceResource(workspaceId, resource, fetcher, force)
    } catch {
      // The observed query owns the error and keeps any previously loaded data visible.
    }
  }, [fetcher, generation, resource, workspaceId])

  const setData = useCallback((next: T): void => {
    if (!workspaceId || getCurrentWorkspaceGeneration() !== generation) return
    setWorkspaceResourceData(workspaceId, resource, next)
  }, [generation, resource, workspaceId])

  const updateData = useCallback((updater: (current: T) => T): void => {
    if (!workspaceId || getCurrentWorkspaceGeneration() !== generation) return
    if (getWorkspaceResourceState<T>(workspaceId, resource).data === undefined) {
      invalidateWorkspaceResource(workspaceId, resource)
      return
    }
    updateWorkspaceResourceData<T>(workspaceId, resource, (current) => current === undefined ? undefined : updater(current))
  }, [generation, resource, workspaceId])

  const setDetailData = useCallback(<Detail,>(id: string, data: Detail | null): void => {
    if (!workspaceId || getCurrentWorkspaceGeneration() !== generation) return
    setWorkspaceDetailData(workspaceId, resource, id, data)
  }, [generation, resource, workspaceId])

  return {
    data: query.data ?? emptyValue,
    error: query.data === undefined ? query.error : null,
    refreshError: query.data !== undefined ? query.error : null,
    hasData: query.data !== undefined,
    isLoading: Boolean(workspaceId) && enabled && query.isPending,
    isInitialLoading: Boolean(workspaceId) && enabled && query.isPending,
    isFetching: query.isFetching,
    load,
    setData,
    updateData,
    setDetailData,
  }
}
