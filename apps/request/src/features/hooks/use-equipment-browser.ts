import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { fetchPublicEquipment } from '@/data/fetch-equipment'
import type { PublicEquipmentItem, EquipmentCategory } from '@/types/equipment'

export function useEquipmentBrowser(checkedOutAt: string, expectedReturnAt: string) {
  const [allItems, setAllItems] = useState<PublicEquipmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilters, setCategoryFilters] = useState<EquipmentCategory[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async (search: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchPublicEquipment(
        checkedOutAt || undefined,
        expectedReturnAt || undefined,
        search || undefined,
      )
      setAllItems(data.filter((item) => item.status !== 'maintenance'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load equipment')
    } finally {
      setLoading(false)
    }
  }, [checkedOutAt, expectedReturnAt])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      load(searchQuery)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchQuery, load])

  const items = useMemo(() => {
    if (categoryFilters.length === 0) return allItems
    return allItems.filter((item) => categoryFilters.includes(item.category))
  }, [allItems, categoryFilters])

  const refresh = useCallback(() => {
    load(searchQuery)
  }, [load, searchQuery])

  return {
    items,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    categoryFilters,
    setCategoryFilters,
    refresh,
  }
}
