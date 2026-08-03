import { useCallback, useState } from 'react'

export function useListDetailSelection<Item>() {
    const [selectedItem, setSelectedItem] = useState<Item | null>(null)

    const close = useCallback(() => setSelectedItem(null), [])
    const select = useCallback((item: Item) => setSelectedItem(item), [])

    return {
        state: { isOpen: selectedItem !== null, selectedItem },
        actions: { close, select },
    }
}
