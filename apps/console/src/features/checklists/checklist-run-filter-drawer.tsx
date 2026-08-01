import { Label } from '@moc/ui/components/display/text'
import { Checkbox } from '@moc/ui/components/form/checkbox'
import { FormLabel } from '@moc/ui/components/form/form-label'
import { Input } from '@moc/ui/components/form/input'
import { Radio, RadioGroup } from '@moc/ui/components/form/radio'
import { Tabs } from '@moc/ui/components/layout/tabs'
import { FilterDrawer } from '@moc/ui/components/overlays/filter-drawer'
import type { ChangeEvent } from 'react'
import type { ChecklistRunCompletionFilter, useChecklistRunFilters } from './use-checklist-run-filters'
import { parseSortValue } from '@/utils/parse-sort-value'

type ChecklistRunFilterDrawerProps = {
    filters: ReturnType<typeof useChecklistRunFilters>
}

const completionFilters: { value: ChecklistRunCompletionFilter; label: string }[] = [
    { value: 'all', label: 'All runs' },
    { value: 'open', label: 'Open runs' },
    { value: 'complete', label: 'Completed runs' },
]

export function ChecklistRunFilterDrawer({ filters }: ChecklistRunFilterDrawerProps) {
    const { filters: state, hasActiveFilters, reset, setCompletion, setDateRange, setIncludePast, setItemCount, setSort } = filters
    const sortValue = `${state.sortField}-${state.sortDirection}`

    function handleSortChange(value: string) {
        const [field, direction] = parseSortValue(value)
        setSort(field as Parameters<typeof setSort>[0], direction as Parameters<typeof setSort>[1])
    }

    function handleIncludePastChange(event: ChangeEvent<HTMLInputElement>) {
        setIncludePast(event.target.checked)
    }

    function handleStartDateChange(event: ChangeEvent<HTMLInputElement>) {
        setDateRange(event.target.value, state.dateRange.end)
    }

    function handleEndDateChange(event: ChangeEvent<HTMLInputElement>) {
        setDateRange(state.dateRange.start, event.target.value)
    }

    function handleCompletionChange(value: string) {
        setCompletion(value as ChecklistRunCompletionFilter)
    }

    function handleMinimumItemsChange(event: ChangeEvent<HTMLInputElement>) {
        setItemCount(event.target.value, state.itemCount.max)
    }

    function handleMaximumItemsChange(event: ChangeEvent<HTMLInputElement>) {
        setItemCount(state.itemCount.min, event.target.value)
    }

    return (
        <FilterDrawer hasActiveFilters={hasActiveFilters} onReset={reset}>
                    <Tabs defaultTab="filters">
                        <Tabs.List>
                            <Tabs.Tab value="filters"><Label.sm>Filters</Label.sm></Tabs.Tab>
                            <Tabs.Tab value="sort"><Label.sm>Sort</Label.sm></Tabs.Tab>
                        </Tabs.List>
                        <Tabs.Panels>
                            <Tabs.Panel value="filters">
                                <FilterDrawer.Group label="Schedule">
                                    <div className="flex flex-col gap-3">
                                        <Checkbox checked={state.includePast} onChange={handleIncludePastChange}>
                                            <FormLabel label="Include past runs" />
                                        </Checkbox>
                                        <div className="flex gap-2">
                                            <label className="space-y-1 *:odd:ml-1">
                                                <FormLabel label="Start Date" />
                                                <Input aria-label="Schedule start date" name="schedule-start" type="date" value={state.dateRange.start} onChange={handleStartDateChange} />
                                            </label>
                                            <label className="space-y-1 *:odd:ml-1">
                                                <FormLabel label="End Date" />
                                                <Input aria-label="Schedule end date" name="schedule-end" type="date" value={state.dateRange.end} onChange={handleEndDateChange} />
                                            </label>
                                        </div>
                                    </div>
                                </FilterDrawer.Group>
                                <FilterDrawer.Group label="Completion">
                                    <RadioGroup
                                        className="grid grid-cols-1 gap-2"
                                        value={state.completion}
                                        onValueChange={handleCompletionChange}
                                    >
                                        {completionFilters.map((option) => (
                                            <Radio key={option.value} value={option.value}>
                                                <FormLabel label={option.label} />
                                            </Radio>
                                        ))}
                                    </RadioGroup>
                                </FilterDrawer.Group>
                                <FilterDrawer.Group label="Checklist Size">
                                    <FilterDrawer.Options>
                                        <label className="space-y-1 *:odd:ml-1">
                                            <FormLabel label="Min Items" />
                                            <Input aria-label="Minimum checklist items" name="minimum-checklist-items" type="number" min={0} value={state.itemCount.min} onChange={handleMinimumItemsChange} />
                                        </label>
                                        <label className="space-y-1 *:odd:ml-1">
                                            <FormLabel label="Max Items" />
                                            <Input aria-label="Maximum checklist items" name="maximum-checklist-items" type="number" min={0} value={state.itemCount.max} onChange={handleMaximumItemsChange} />
                                        </label>
                                    </FilterDrawer.Options>
                                </FilterDrawer.Group>
                            </Tabs.Panel>
                            <Tabs.Panel value="sort">
                                <RadioGroup
                                    value={sortValue}
                                    onValueChange={handleSortChange}
                                >
                                <FilterDrawer.Group label="Scheduled Date">
                                    <FilterDrawer.Options>
                                        <Radio value="scheduledAt-asc"><FormLabel label="Ascending" /></Radio>
                                        <Radio value="scheduledAt-desc"><FormLabel label="Descending" /></Radio>
                                    </FilterDrawer.Options>
                                </FilterDrawer.Group>
                                <FilterDrawer.Group label="Name">
                                    <FilterDrawer.Options>
                                        <Radio value="name-asc"><FormLabel label="A-Z" /></Radio>
                                        <Radio value="name-desc"><FormLabel label="Z-A" /></Radio>
                                    </FilterDrawer.Options>
                                </FilterDrawer.Group>
                                <FilterDrawer.Group label="Checklist Progress">
                                    <FilterDrawer.Options>
                                        <Radio value="items-asc"><FormLabel label="Fewest items" /></Radio>
                                        <Radio value="items-desc"><FormLabel label="Most items" /></Radio>
                                        <Radio value="completed-asc"><FormLabel label="Least complete" /></Radio>
                                        <Radio value="completed-desc"><FormLabel label="Most complete" /></Radio>
                                    </FilterDrawer.Options>
                                </FilterDrawer.Group>
                                </RadioGroup>
                            </Tabs.Panel>
                        </Tabs.Panels>
                    </Tabs>
        </FilterDrawer>
    )
}
