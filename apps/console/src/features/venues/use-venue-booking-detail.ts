import { fetchVenueBookingById } from "@/data/fetch-venue-bookings"
import { useWorkspaceDetail } from "@/hooks/use-workspace-detail"
import { useWorkspace } from "@/lib/workspace-context"

export function useVenueBookingDetail(id: string | undefined) {
  const { currentWorkspaceId } = useWorkspace()
  const detail = useWorkspaceDetail({ resource: "venue-bookings", fetcher: fetchVenueBookingById, id, workspaceId: currentWorkspaceId })

  return {
    state: { booking: detail.data, error: detail.error, isLoading: detail.isLoading },
    actions: { retry: detail.retry },
  }
}
