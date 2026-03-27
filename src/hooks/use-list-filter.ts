import { useState, useMemo, useCallback } from 'react'

interface UseListFilterOptions<T> {
  data: T[]
  searchFields: (keyof T)[]
  initialFilters?: Record<string, string[]>
}

interface UseListFilterResult<T> {
  search: string
  setSearch: (value: string) => void
  activeFilters: Record<string, string[]>
  filtered: T[]
  handleFilterChange: (key: string, value: string) => void
  clearFilters: () => void
}

export function useListFilter<T>({ data, searchFields, initialFilters = {} }: UseListFilterOptions<T>): UseListFilterResult<T> {
  const [search, setSearch] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>(initialFilters)

  const filtered = useMemo(() => {
    return data.filter((item) => {
      if (search) {
        const match = searchFields.some((field) =>
          String(item[field]).toLowerCase().includes(search.toLowerCase())
        )
        if (!match) return false
      }
      for (const [key, values] of Object.entries(activeFilters)) {
        if (values.length > 0 && !values.includes(String((item as Record<string, unknown>)[key]))) {
          return false
        }
      }
      return true
    })
  }, [data, search, activeFilters, searchFields])

  const handleFilterChange = useCallback((key: string, value: string) => {
    setActiveFilters((prev) => {
      const current = prev[key] ?? []
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      return { ...prev, [key]: next }
    })
  }, [])

  const clearFilters = useCallback(() => {
    setActiveFilters({})
  }, [])

  return { search, setSearch, activeFilters, filtered, handleFilterChange, clearFilters }
}
