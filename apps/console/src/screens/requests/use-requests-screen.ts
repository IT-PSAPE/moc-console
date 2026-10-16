import { useEffect, useRef } from "react"
import { useRequestFilters } from "@/features/requests/use-request-filters"
import { useRequests } from "@/features/requests/request-provider"
import { useViewQuery } from "@/hooks/use-view-query"
import { useIsLandscape } from "@moc/ui/hooks/use-is-landscape"
import type { Request } from "@moc/types/requests"
import { useListDetailSelection } from "@/hooks/use-list-detail-selection"
import { useRequestWorkView } from "@/features/requests/use-request-work-view"
import { useSearchParams } from "react-router-dom"

const requestViews = ["list", "kanban", "calendar"] as const

export function useRequestsScreen() {
  const [view, setView] = useViewQuery(requestViews, "list")
  const [, setSearchParams] = useSearchParams()
  const isLandscape = useIsLandscape()
  const activeView = isLandscape && view === "kanban" ? "list" : view
  const {
    state: { allRequests, isLoadingActive, isLoadingArchived, isLoadingCategories, isInitialLoadingActive, isInitialLoadingArchived, isInitialLoadingCategories, activeError, archivedError, categoriesError },
    actions: { loadActiveRequests, loadArchivedRequests, retryActiveRequests, retryArchivedRequests, retryCategories },
  } = useRequests()
  const filters = useRequestFilters(allRequests)
  const detail = useListDetailSelection<Request>(allRequests)
  const { close: closeDetail, select: selectRequest } = detail.actions
  const { includesArchived } = filters
  const loadsArchived = includesArchived || activeView === "calendar"
  const requestsForView = activeView === "calendar" ? filters.calendarFiltered : filters.filtered
  const workView = useRequestWorkView(requestsForView)
  const refreshAssigned = workView.actions.retry
  const workViewType = workView.meta.view
  const previousSelectedId = useRef(detail.state.selectedId)

  useEffect(() => {
    void loadActiveRequests()
  }, [loadActiveRequests])

  useEffect(() => {
    if (loadsArchived) void loadArchivedRequests()
  }, [loadsArchived, loadArchivedRequests])

  useEffect(() => {
    if (activeView !== "list") closeDetail()
  }, [activeView, closeDetail])

  useEffect(() => {
    if (previousSelectedId.current && !detail.state.selectedId && workViewType === "assigned") {
      void refreshAssigned()
    }
    previousSelectedId.current = detail.state.selectedId
  }, [detail.state.selectedId, refreshAssigned, workViewType])

  function changeView(value: string) {
    setView(value)
  }

  function resetFilters() {
    filters.reset(false)
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.delete("q")
      next.delete("workView")
      return next
    }, { replace: true })
  }

  async function retryCollection() {
    if (workViewType === "assigned" && workView.meta.error) {
      await refreshAssigned()
      return
    }
    const retries = [retryActiveRequests()]
    if (loadsArchived) retries.push(retryArchivedRequests())
    await Promise.all(retries)
  }

  return {
    state: { detailOpen: detail.state.isOpen, selectedRequest: detail.state.selectedItem },
    actions: { changeView, closeDetail, selectRequest, retryCollection, retryCategories, resetFilters, changeWorkView: workView.actions.changeView },
    meta: {
      filters,
      workView: workViewType,
      workViewRequests: workView.state.visibleRequests,
      activeView,
      isLandscape,
      collectionError: workViewType === "assigned" ? workView.meta.error ?? activeError ?? (loadsArchived ? archivedError : null) : activeError ?? (loadsArchived ? archivedError : null),
      collectionErrorTitle: workViewType === "assigned" && workView.meta.error ? "Couldn't load your assigned requests" : "Couldn't load requests",
      categoriesError,
      isLoading: isLoadingActive || isLoadingCategories || (loadsArchived && isLoadingArchived) || workView.meta.isLoading,
      isInitialLoading: isInitialLoadingActive || isInitialLoadingCategories || (loadsArchived && isInitialLoadingArchived) || workView.meta.isInitialLoading,
    },
  }
}
