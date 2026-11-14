import { ArrowCounterClockwise as Undo } from '@phosphor-icons/react'
import { Button } from '../controls/button'
import { Dropdown } from './dropdown'
import { useFilterMenu } from './filter-menu-context'

export function FilterMenuReset() {
    const { state, actions } = useFilterMenu()
    return <><Dropdown.Separator /><Dropdown.Item nativeButton onSelect={actions.reset} closeOnClick={false} disabled={!state.hasActiveFilters} render={<Button variant="ghost" size="sm" icon={<Undo />} />} className="w-full justify-center">Reset filters</Dropdown.Item></>
}
