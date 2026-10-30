import { fetchRequestById } from "@/data/fetch-requests"
import { useWorkspaceDetail } from "@/hooks/use-workspace-detail"
import { useWorkspace } from "@/lib/workspace-context"
import { useRequests } from "./request-provider"

export function useRequestDetailLoader(id: string | undefined) {
  const { currentWorkspaceId } = useWorkspace()
  const { state: { requestsById }, actions: { syncRequest } } = useRequests()
  const collectionResource = id && requestsById[id]?.status === "archived" ? "requests:archived" : "requests:active"
  const detail = useWorkspaceDetail({ fetcher: fetchRequestById, resource: "requests", id, workspaceId: currentWorkspaceId, collectionResource })
  return {
    state: { request: detail.data, error: detail.error, isLoading: detail.isLoading },
    actions: { retry: detail.retry, syncRequest },
  }
}
