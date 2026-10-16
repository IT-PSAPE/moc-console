import { createContext, useContext } from 'react'

export type FilterMenuContextValue = {
    state: { hasActiveFilters: boolean }
    actions: { reset: () => void }
    meta: Record<string, never>
}
export const FilterMenuContext = createContext<FilterMenuContextValue | null>(null)
type FilterMenuGroupContextValue = { state: { active: boolean }; actions: Record<string, never>; meta: Record<string, never> }
export const FilterMenuGroupContext = createContext<FilterMenuGroupContextValue | null>(null)

export function useFilterMenu(): FilterMenuContextValue {
    const context = useContext(FilterMenuContext)
    if (!context) throw new Error('Filter menu components require FilterMenu.Root')
    return context
}
export function useFilterMenuGroup(): FilterMenuGroupContextValue {
    const context = useContext(FilterMenuGroupContext)
    if (!context) throw new Error('Filter group components require FilterMenu.Group')
    return context
}
