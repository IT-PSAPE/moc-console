import { useEffect } from "react"
import { useRequestFilters } from "@/features/requests/use-request-filters"
import { useRequests } from "@/features/requests/request-provider"
import { useViewQuery } from "@/hooks/use-view-query"
import { useIsMobile } from "@moc/ui/hooks/use-is-mobile"
import type { Request } from "@moc/types/requests"
import { useListDetailSelection } from "@/hooks/use-list-detail-selection"

const requestViews = ["list", "kanban", "calendar"] as const

export function useRequestsScreen() {
  const [view, setView] = useViewQuery(requestViews, "list")
  const isMobile = useIsMobile()
  const activeView = isMobile && view === "kanban" ? "list" : view
  const {
    state: { allRequests, isLoadingActive, isLoadingArchived },
    actions: { loadActiveRequests, loadArchivedRequests },
  } = useRequests()
  const filters = useRequestFilters(allRequests)
  const detail = useListDetailSelection<Request>(allRequests)
  const { close: closeDetail, select: selectRequest } = detail.actions
  const { includesArchived } = filters
  const loadsArchived = includesArchived || activeView === "calendar"

  useEffect(() => {
    void loadActiveRequests()
  }, [loadActiveRequests])

  useEffect(() => {
    if (loadsArchived) void loadArchivedRequests()
  }, [loadsArchived, loadArchivedRequests])

  useEffect(() => {
    if (activeView !== "list") closeDetail()
  }, [activeView, closeDetail])

  function changeView(value: string) {
    setView(value)
  }

  return {
    state: { detailOpen: detail.state.isOpen, selectedRequest: detail.state.selectedItem },
    actions: { changeView, closeDetail, selectRequest },
    meta: {
      filters,
      activeView,
      isMobile,
      isLoading: isLoadingActive || (loadsArchived && isLoadingArchived),
    },
  }
}
