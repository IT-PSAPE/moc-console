import { useCallback, useMemo, useState } from "react"
import type { Stream, StreamStatus, StreamPrivacy } from "@moc/types/streams/stream"

export type StreamSortField = "title" | "scheduledStartTime" | "createdAt" | "status"
export type SortDirection = "asc" | "desc"

export type StreamFilters = {
  search: string
  statuses: Set<StreamStatus>
  privacies: Set<StreamPrivacy>
  scheduledDateRange: { start: string; end: string }
  showCompleted: boolean
  sortField: StreamSortField
  sortDirection: SortDirection
}

const defaultFilters: StreamFilters = {
  search: "",
  statuses: new Set(),
  privacies: new Set(),
  scheduledDateRange: { start: "", end: "" },
  showCompleted: false,
  sortField: "scheduledStartTime",
  sortDirection: "desc",
}

export function useStreamFilters(streams: Stream[]) {
  const [filters, setFilters] = useState<StreamFilters>(defaultFilters)

  const results = useMemo(() => {
    let result = streams

    if (filters.privacies.size > 0) {
      result = result.filter((s) => filters.privacies.has(s.privacyStatus))
    }

    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q),
      )
    }

    if (filters.scheduledDateRange.start) {
      const start = new Date(filters.scheduledDateRange.start)
      result = result.filter(
        (s) => s.scheduledStartTime && new Date(s.scheduledStartTime) >= start,
      )
    }

    if (filters.scheduledDateRange.end) {
      const end = new Date(filters.scheduledDateRange.end)
      result = result.filter(
        (s) => s.scheduledStartTime && new Date(s.scheduledStartTime) <= end,
      )
    }

    const dir = filters.sortDirection === "asc" ? 1 : -1
    result = [...result].sort((a, b) => {
      switch (filters.sortField) {
        case "title":
          return dir * a.title.localeCompare(b.title)
        case "scheduledStartTime": {
          const da = a.scheduledStartTime ? new Date(a.scheduledStartTime).getTime() : 0
          const db = b.scheduledStartTime ? new Date(b.scheduledStartTime).getTime() : 0
          return dir * (da - db)
        }
        case "createdAt":
          return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        case "status":
          return dir * a.streamStatus.localeCompare(b.streamStatus)
      }
    })

    const calendarFiltered = result
    const visibleStatuses = calendarFiltered.filter((stream) => {
      if (!filters.showCompleted && stream.streamStatus === "complete") return false
      return filters.statuses.size === 0 || filters.statuses.has(stream.streamStatus)
    })

    return { calendarFiltered, filtered: visibleStatuses }
  }, [streams, filters])

  const setSearch = useCallback((search: string) => {
    setFilters((f) => ({ ...f, search }))
  }, [])

  const toggleStatus = useCallback((status: StreamStatus) => {
    setFilters((f) => {
      const next = new Set(f.statuses)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return { ...f, statuses: next }
    })
  }, [])

  const togglePrivacy = useCallback((privacy: StreamPrivacy) => {
    setFilters((f) => {
      const next = new Set(f.privacies)
      if (next.has(privacy)) next.delete(privacy)
      else next.add(privacy)
      return { ...f, privacies: next }
    })
  }, [])

  const setScheduledDateRange = useCallback((start: string, end: string) => {
    setFilters((f) => ({ ...f, scheduledDateRange: { start, end } }))
  }, [])

  const setShowCompleted = useCallback((showCompleted: boolean) => {
    setFilters((f) => ({ ...f, showCompleted }))
  }, [])

  const setSort = useCallback((field: StreamSortField, direction: SortDirection) => {
    setFilters((f) => ({ ...f, sortField: field, sortDirection: direction }))
  }, [])

  const reset = useCallback(() => {
    setFilters(defaultFilters)
  }, [])

  const hasActiveFilters =
    filters.statuses.size > 0 ||
    filters.privacies.size > 0 ||
    filters.scheduledDateRange.start !== "" ||
    filters.scheduledDateRange.end !== "" ||
    filters.showCompleted !== false

  return {
    filters,
    filtered: results.filtered,
    calendarFiltered: results.calendarFiltered,
    hasActiveFilters,
    setSearch,
    toggleStatus,
    togglePrivacy,
    setScheduledDateRange,
    setShowCompleted,
    setSort,
    reset,
  }
}
