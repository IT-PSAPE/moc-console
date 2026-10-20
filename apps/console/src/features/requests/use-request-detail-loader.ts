import { fetchRequestById } from "@/data/fetch-requests"
import { useWorkspaceDetail } from "@/hooks/use-workspace-detail"
import { useWorkspace } from "@/lib/workspace-context"
import { queryClient } from "@/lib/query-client"
import { workspaceResourceKey } from "@/data/workspace-resource-cache"
import { useRequests } from "./request-provider"

export function useRequestDetailLoader(id: string | undefined) {
  const { currentWorkspaceId } = useWorkspace()
  const { state: { requestsById }, actions: { syncRequest } } = useRequests()
  const initialData = id ? requestsById[id] : undefined
  const collectionResource = initialData?.status === "archived" ? "requests:archived" : "requests:active"
  const initialDataUpdatedAt = queryClient.getQueryState(workspaceResourceKey(currentWorkspaceId, collectionResource))?.dataUpdatedAt
  const detail = useWorkspaceDetail({ fetcher: fetchRequestById, resource: "requests", id, workspaceId: currentWorkspaceId, initialData, initialDataUpdatedAt })
  return {
    state: { request: detail.data, error: detail.error, isLoading: detail.isLoading },
    actions: { retry: detail.retry, syncRequest },
  }
}
