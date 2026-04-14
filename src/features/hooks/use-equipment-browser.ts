import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchPublicEquipment } from '@/data/fetch-equipment'
import type { PublicEquipmentItem, EquipmentCategory } from '@/types/equipment'

export function useEquipmentBrowser(checkedOutAt: string, expectedReturnAt: string) {
  const [items, setItems] = useState<PublicEquipmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<EquipmentCategory | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async (search: string, category: EquipmentCategory | null) => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchPublicEquipment(
        checkedOutAt || undefined,
        expectedReturnAt || undefined,
        search || undefined,
        category ?? undefined,
      )
      setItems(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load equipment')
    } finally {
      setLoading(false)
    }
  }, [checkedOutAt, expectedReturnAt])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      load(searchQuery, categoryFilter)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchQuery, categoryFilter, load])

  const refresh = useCallback(() => {
    load(searchQuery, categoryFilter)
  }, [load, searchQuery, categoryFilter])

  return {
    items,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    refresh,
  }
}
