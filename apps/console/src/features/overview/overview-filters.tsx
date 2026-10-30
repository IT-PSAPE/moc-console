import { CheckboxGroup } from '@moc/ui/components/form/checkbox-group'
import { Paragraph } from '@moc/ui/components/display/text'
import { Drawer } from '@moc/ui/components/overlays/drawer'
import { FilterDrawer } from '@moc/ui/components/overlays/filter-drawer'
import { useOverviewContext } from './overview-context'

export function OverviewFilters() {
  const { state, actions, meta } = useOverviewContext()
  function renderKind(option: (typeof meta.filterOptions)[number]) {
    return <CheckboxGroup.Item key={option.value} value={option.value}>{option.label}</CheckboxGroup.Item>
  }
  return <Drawer open={state.filtersOpen} onOpenChange={actions.setFiltersOpen} triggerRef={meta.filterTriggerRef} mobileSide="bottom" defaultSnapPoint={1}>
    <FilterDrawer title="Filter overview" hasActiveFilters={state.overridden} onReset={actions.resetKinds}>
      <FilterDrawer.Group label="Show in your agenda">
        <CheckboxGroup.Root label="Overview items" values={state.kinds} onValueChange={actions.changeKinds}>{meta.filterOptions.map(renderKind)}</CheckboxGroup.Root>
      </FilterDrawer.Group>
      <Paragraph.xs className="text-tertiary">Changes here apply to this view. Your saved preferences stay the same.</Paragraph.xs>
    </FilterDrawer>
  </Drawer>
}
