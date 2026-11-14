import type { ComponentProps } from 'react'
import { Funnel as Filter } from '@phosphor-icons/react'
import { Button } from '../controls/button'
import { Indicator } from '../display/indicator'
import { Dropdown } from './dropdown'
import { useFilterMenu } from './filter-menu-context'

export function FilterMenuTrigger({ children = 'Filter', 'aria-label': ariaLabel = 'Filter', ...props }: ComponentProps<typeof Button>) {
    const { state } = useFilterMenu()
    return <Dropdown.Trigger><Button variant="secondary" icon={<Filter />} aria-label={state.hasActiveFilters ? `${ariaLabel}, filters applied` : ariaLabel} {...props}>{children}<Indicator.Dot color="brand" aria-hidden="true" className={state.hasActiveFilters ? undefined : "opacity-0"} /></Button></Dropdown.Trigger>
}
