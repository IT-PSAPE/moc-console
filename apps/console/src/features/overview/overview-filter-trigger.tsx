import { Settings2 } from 'lucide-react'
import { Button } from '@moc/ui/components/controls/button'
import { useOverviewContext } from './overview-context'

export function OverviewFilterTrigger() {
  const { state, actions, meta: { filterTriggerRef } } = useOverviewContext()
  return <Button ref={filterTriggerRef} variant="secondary" size="sm" icon={<Settings2 />} aria-label="Filter overview" aria-pressed={state.overridden} className={state.overridden ? 'text-brand' : undefined} disabled={state.filtersDisabled} onClick={actions.openFilters}>Filter</Button>
}
