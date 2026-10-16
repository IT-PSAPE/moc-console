import type { ReactNode } from 'react'
import { Dropdown } from './dropdown'
import { FilterMenuContext } from './filter-menu-context'
import { FilterMenuTrigger } from './filter-menu-trigger'
import { FilterMenuReset } from './filter-menu-reset'
import { FilterMenuGroup } from './filter-menu-group'
import { FilterMenuGroupTrigger } from './filter-menu-group-trigger'

type FilterMenuRootProps = { hasActiveFilters: boolean; onReset: () => void; children: ReactNode }

function FilterMenuRoot({ hasActiveFilters, onReset, children }: FilterMenuRootProps) {
    return <FilterMenuContext.Provider value={{ state: { hasActiveFilters }, actions: { reset: onReset }, meta: {} }}><Dropdown modal={false} placement="bottom-end">{children}</Dropdown></FilterMenuContext.Provider>
}

export const FilterMenu = {
    Root: FilterMenuRoot,
    Trigger: FilterMenuTrigger,
    Reset: FilterMenuReset,
    Content: Dropdown.Panel,
    Group: FilterMenuGroup,
    GroupTrigger: FilterMenuGroupTrigger,
    GroupContent: Dropdown.SubmenuPanel,
    Options: Dropdown.CheckboxList,
}
