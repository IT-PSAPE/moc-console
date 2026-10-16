import type { ReactNode } from 'react'
import { Dropdown } from './dropdown'
import { FilterMenuGroupContext } from './filter-menu-context'

export function FilterMenuGroup({ active, children }: { active: boolean; children: ReactNode }) {
    return <FilterMenuGroupContext.Provider value={{ state: { active }, actions: {}, meta: {} }}><Dropdown.Submenu>{children}</Dropdown.Submenu></FilterMenuGroupContext.Provider>
}
