import { useMemo, useState } from "react"
import type { MediaItem } from "@/types/broadcast/media-item"
import type { MediaType } from "@/types/broadcast/media-type"

// ─── Filter / Sort state ───────────────────────────────

export type SortField = "name" | "createdAt" | "type"
export type SortDirection = "asc" | "desc"

export type MediaFilters = {
  search: string
  types: Set<MediaType>
  sortField: SortField
  sortDirection: SortDirection
}

const defaultFilters: MediaFilters = {
  search: "",
  types: new Set(),
  sortField: "createdAt",
  sortDirection: "desc",
}

// ─── Hook ──────────────────────────────────────────────

export function useMediaFilters(media: MediaItem[]) {
  const [filters, setFilters] = useState<MediaFilters>(defaultFilters)

  const filtered = useMemo(() => {
    let result = media

    // Search
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter((m) => m.name.toLowerCase().includes(q))
    }

    // Type filter
    if (filters.types.size > 0) {
      result = result.filter((m) => filters.types.has(m.type))
    }

    // Sort
    const dir = filters.sortDirection === "asc" ? 1 : -1
    result = [...result].sort((a, b) => {
      switch (filters.sortField) {
        case "name":
          return dir * a.name.localeCompare(b.name)
        case "createdAt":
          return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        case "type":
          return dir * a.type.localeCompare(b.type)
      }
    })

    return result
  }, [media, filters])

  // ─── Actions ─────────────────────────────────────────

  function setSearch(search: string) {
    setFilters((f) => ({ ...f, search }))
  }

  function toggleType(type: MediaType) {
    setFilters((f) => {
      const next = new Set(f.types)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return { ...f, types: next }
    })
  }

  function setType(type: MediaType | null) {
    setFilters((f) => ({
      ...f,
      types: type ? new Set([type]) : new Set(),
    }))
  }

  function setSort(field: SortField, direction: SortDirection) {
    setFilters((f) => ({ ...f, sortField: field, sortDirection: direction }))
  }

  function reset() {
    setFilters(defaultFilters)
  }

  const hasActiveFilters = filters.types.size > 0

  return {
    filters,
    filtered,
    hasActiveFilters,
    setSearch,
    toggleType,
    setType,
    setSort,
    reset,
  }
}
