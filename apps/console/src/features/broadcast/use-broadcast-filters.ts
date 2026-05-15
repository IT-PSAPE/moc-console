import { useMemo, useState } from "react"
import type { Playlist } from "@moc/types/broadcast/broadcast"
import type { PlaylistStatus } from "@moc/types/broadcast/broadcast-status"

// ─── Filter / Sort state ───────────────────────────────

export type SortField = "name" | "createdAt"
export type SortDirection = "asc" | "desc"

export type PlaylistFilters = {
  search: string
  statuses: Set<PlaylistStatus>
  sortField: SortField
  sortDirection: SortDirection
}

const defaultFilters: PlaylistFilters = {
  search: "",
  statuses: new Set(),
  sortField: "createdAt",
  sortDirection: "desc",
}

// ─── Hook ──────────────────────────────────────────────

export function usePlaylistFilters(playlists: Playlist[]) {
  const [filters, setFilters] = useState<PlaylistFilters>(defaultFilters)

  const filtered = useMemo(() => {
    let result = playlists

    // Search
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q),
      )
    }

    // Status filter
    if (filters.statuses.size > 0) {
      result = result.filter((p) => filters.statuses.has(p.status))
    }

    // Sort
    const dir = filters.sortDirection === "asc" ? 1 : -1
    result = [...result].sort((a, b) => {
      switch (filters.sortField) {
        case "name":
          return dir * a.name.localeCompare(b.name)
        case "createdAt":
          return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      }
    })

    return result
  }, [playlists, filters])

  // ─── Actions ─────────────────────────────────────────

  function setSearch(search: string) {
    setFilters((f) => ({ ...f, search }))
  }

  function toggleStatus(status: PlaylistStatus) {
    setFilters((f) => {
      const next = new Set(f.statuses)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return { ...f, statuses: next }
    })
  }

  function setSort(field: SortField, direction: SortDirection) {
    setFilters((f) => ({ ...f, sortField: field, sortDirection: direction }))
  }

  function reset() {
    setFilters(defaultFilters)
  }

  const hasActiveFilters = filters.statuses.size > 0

  return {
    filters,
    filtered,
    hasActiveFilters,
    setSearch,
    toggleStatus,
    setSort,
    reset,
  }
}
