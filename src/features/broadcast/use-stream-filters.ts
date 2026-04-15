import { useMemo, useState } from "react"
import type { Stream, StreamStatus } from "@/types/broadcast/stream"

export type StreamFilters = {
  search: string
  statuses: Set<StreamStatus>
}

const defaultFilters: StreamFilters = {
  search: "",
  statuses: new Set(),
}

export function useStreamFilters(streams: Stream[]) {
  const [filters, setFilters] = useState<StreamFilters>(defaultFilters)

  const filtered = useMemo(() => {
    let result = streams

    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q),
      )
    }

    if (filters.statuses.size > 0) {
      result = result.filter((s) => filters.statuses.has(s.streamStatus))
    }

    return result
  }, [streams, filters])

  function setSearch(search: string) {
    setFilters((f) => ({ ...f, search }))
  }

  return {
    filters,
    filtered,
    setSearch,
  }
}
