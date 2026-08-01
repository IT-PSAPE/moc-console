import { useEffect } from "react"
import { useRequestFilters } from "@/features/requests/use-request-filters"
import { useRequests } from "@/features/requests/request-provider"
import { useViewQuery } from "@/hooks/use-view-query"
import { useIsMobile } from "@moc/ui/hooks/use-is-mobile"

const requestViews = ["list", "table", "kanban", "calendar"] as const

export function useRequestsScreen() {
  const [view, setView] = useViewQuery(requestViews, "list")
  const isMobile = useIsMobile()
  const activeView = isMobile && (view === "table" || view === "kanban") ? "list" : view
  const {
    state: { allRequests, isLoadingActive, isLoadingArchived },
    actions: { loadActiveRequests, loadArchivedRequests },
  } = useRequests()
  const filters = useRequestFilters(allRequests)
  const { includesArchived } = filters

  useEffect(() => {
    void loadActiveRequests()
  }, [loadActiveRequests])

  useEffect(() => {
    if (includesArchived) void loadArchivedRequests()
  }, [includesArchived, loadArchivedRequests])

  function changeView(value: string) {
    setView(value)
  }

  return {
    actions: { changeView },
    meta: {
      filters,
      activeView,
      isMobile,
      isLoading: isLoadingActive || (includesArchived && isLoadingArchived),
    },
  }
}
