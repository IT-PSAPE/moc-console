import { fetchBookingById } from "@/data/fetch-equipment";
import { useWorkspaceDetail } from "@/hooks/use-workspace-detail";
import { useWorkspace } from "@/lib/workspace-context";

export function useBookingDetail(id: string | undefined) {
  const { currentWorkspaceId } = useWorkspace();
  const detail = useWorkspaceDetail({ fetcher: fetchBookingById, id, workspaceId: currentWorkspaceId });

  return {
    state: { booking: detail.data, error: detail.error, isLoading: detail.isLoading },
    actions: { retry: detail.retry },
  };
}
