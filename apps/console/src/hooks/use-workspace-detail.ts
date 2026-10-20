import { workspaceResourceKey } from "@/data/workspace-resource-cache"
import { useQuery } from "@tanstack/react-query"
import { useCallback } from "react"
import { consoleQueryPolicy } from "@/lib/console-query-policy"

type WorkspaceDetailOptions<T> = {
  fetcher: (id: string, workspaceId: string) => Promise<T | undefined>
  id: string | undefined
  workspaceId: string | null
  resource: string
  initialData?: T
  initialDataUpdatedAt?: number
}

export function useWorkspaceDetail<T>({ fetcher, id, workspaceId, resource, initialData, initialDataUpdatedAt }: WorkspaceDetailOptions<T>) {
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
  const collectionIsNewer = initialData !== undefined && (initialDataUpdatedAt ?? 0) > query.dataUpdatedAt
  return { data: collectionIsNewer ? initialData : query.data ?? null, error: query.data === undefined ? query.error : null, refreshError: query.data !== undefined ? query.error : null, isLoading: Boolean(id && workspaceId) && query.isPending, retry }
}
