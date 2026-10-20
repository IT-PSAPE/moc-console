import { createContext, useContext } from 'react'

export type SortableListContextValue = {
    state: { disabled: boolean }
    actions: Record<string, never>
    meta: Record<string, never>
}

export const SortableListContext = createContext<SortableListContextValue | null>(null)

export function useSortableListContext(component: string) {
    const context = useContext(SortableListContext)
    if (!context) {
        throw new Error(`${component} must be used inside <SortableList.Root>`)
    }
    return context
}
