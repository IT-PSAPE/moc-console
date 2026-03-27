import { useState, useMemo } from 'react'

interface UseListFilterOptions<T> {
  data: T[]
  searchFields: (keyof T)[]
  initialFilters?: Record<string, string>
}

interface UseListFilterResult<T> {
  search: string
  setSearch: (value: string) => void
  activeFilters: Record<string, string>
  filtered: T[]
  handleFilterChange: (key: string, value: string) => void
}

export function useListFilter<T>({ data, searchFields, initialFilters = {} }: UseListFilterOptions<T>): UseListFilterResult<T> {
  const [search, setSearch] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>(initialFilters)

  const filtered = useMemo(() => {
    return data.filter((item) => {
      if (search) {
        const match = searchFields.some((field) =>
          String(item[field]).toLowerCase().includes(search.toLowerCase())
        )
        if (!match) return false
      }
      for (const [key, value] of Object.entries(activeFilters)) {
        if (value && (item as Record<string, unknown>)[key] !== value) return false
      }
      return true
    })
  }, [data, search, activeFilters, searchFields])

  function handleFilterChange(key: string, value: string) {
    setActiveFilters((prev) => {
      const next = { ...prev }
      if (value) next[key] = value
      else delete next[key]
      return next
    })
  }

  return { search, setSearch, activeFilters, filtered, handleFilterChange }
}
