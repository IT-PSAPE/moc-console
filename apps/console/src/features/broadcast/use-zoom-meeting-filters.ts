import { useMemo, useState } from "react"
import type { ZoomMeeting, ZoomRecurrenceType } from "@/types/broadcast/zoom"

export type ZoomMeetingSortField = "topic" | "startTime" | "createdAt" | "duration"
export type SortDirection = "asc" | "desc"

export type ZoomMeetingFilters = {
  search: string
  recurrenceTypes: Set<ZoomRecurrenceType>
  dateRange: { start: string; end: string }
  showPast: boolean
  sortField: ZoomMeetingSortField
  sortDirection: SortDirection
}

const defaultFilters: ZoomMeetingFilters = {
  search: "",
  recurrenceTypes: new Set(),
  dateRange: { start: "", end: "" },
  showPast: false,
  sortField: "startTime",
  sortDirection: "asc",
}

function isMeetingPast(meeting: ZoomMeeting): boolean {
  // Recurring meetings with no fixed end are never considered "past"
  if (meeting.recurrenceType !== "none") return false
  if (!meeting.startTime) return false
  return new Date(meeting.startTime) < new Date()
}

export function useZoomMeetingFilters(meetings: ZoomMeeting[]) {
  const [filters, setFilters] = useState<ZoomMeetingFilters>(defaultFilters)

  const filtered = useMemo(() => {
    let result = meetings

    if (!filters.showPast) {
      result = result.filter((m) => !isMeetingPast(m))
    }

    if (filters.recurrenceTypes.size > 0) {
      result = result.filter((m) => filters.recurrenceTypes.has(m.recurrenceType))
    }

    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        (m) =>
          m.topic.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q),
      )
    }

    if (filters.dateRange.start) {
      const start = new Date(filters.dateRange.start)
      result = result.filter(
        (m) => m.startTime && new Date(m.startTime) >= start,
      )
    }

    if (filters.dateRange.end) {
      const end = new Date(filters.dateRange.end)
      result = result.filter(
        (m) => m.startTime && new Date(m.startTime) <= end,
      )
    }

    const dir = filters.sortDirection === "asc" ? 1 : -1
    result = [...result].sort((a, b) => {
      switch (filters.sortField) {
        case "topic":
          return dir * a.topic.localeCompare(b.topic)
        case "startTime": {
          const da = a.startTime ? new Date(a.startTime).getTime() : 0
          const db = b.startTime ? new Date(b.startTime).getTime() : 0
          return dir * (da - db)
        }
        case "createdAt":
          return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        case "duration":
          return dir * (a.duration - b.duration)
      }
    })

    return result
  }, [meetings, filters])

  function setSearch(search: string) {
    setFilters((f) => ({ ...f, search }))
  }

  function toggleRecurrenceType(type: ZoomRecurrenceType) {
    setFilters((f) => {
      const next = new Set(f.recurrenceTypes)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return { ...f, recurrenceTypes: next }
    })
  }

  function setDateRange(start: string, end: string) {
    setFilters((f) => ({ ...f, dateRange: { start, end } }))
  }

  function setShowPast(showPast: boolean) {
    setFilters((f) => ({ ...f, showPast }))
  }

  function setSort(field: ZoomMeetingSortField, direction: SortDirection) {
    setFilters((f) => ({ ...f, sortField: field, sortDirection: direction }))
  }

  function reset() {
    setFilters(defaultFilters)
  }

  const hasActiveFilters =
    filters.recurrenceTypes.size > 0 ||
    filters.dateRange.start !== "" ||
    filters.dateRange.end !== "" ||
    filters.showPast !== false

  return {
    filters,
    filtered,
    hasActiveFilters,
    setSearch,
    toggleRecurrenceType,
    setDateRange,
    setShowPast,
    setSort,
    reset,
  }
}
