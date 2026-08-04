import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

export function useListDetailSelection<Item extends { id: string }>(items: readonly Item[], queryKey = 'selected') {
    const [searchParams, setSearchParams] = useSearchParams()
    const selectedId = searchParams.get(queryKey)
    const selectedItem = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId])

    const close = useCallback(() => {
        const nextSearchParams = new URLSearchParams(searchParams)
        nextSearchParams.delete(queryKey)
        setSearchParams(nextSearchParams, { replace: true })
    }, [queryKey, searchParams, setSearchParams])

    const select = useCallback((item: Item) => {
        const nextSearchParams = new URLSearchParams(searchParams)
        nextSearchParams.set(queryKey, item.id)
        setSearchParams(nextSearchParams)
    }, [queryKey, searchParams, setSearchParams])

    return {
        state: { isOpen: selectedItem !== null, selectedId, selectedItem },
        actions: { close, select },
    }
}
