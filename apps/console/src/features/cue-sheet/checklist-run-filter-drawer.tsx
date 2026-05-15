import { Button } from '@/components/controls/button'
import { Divider } from '@/components/display/divider'
import { Label, Paragraph } from '@/components/display/text'
import { Checkbox } from '@/components/form/checkbox'
import { FormLabel } from '@/components/form/form-label'
import { Input } from '@/components/form/input'
import { Radio } from '@/components/form/radio'
import { Tabs } from '@/components/layout/tabs'
import { Drawer } from '@/components/overlays/drawer'
import { RotateCcw, X } from 'lucide-react'
import type { ChecklistRunCompletionFilter, useChecklistRunFilters } from './use-checklist-run-filters'

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

    return (
        <Drawer.Portal>
            <Drawer.Backdrop />
            <Drawer.Panel>
                <Drawer.Header>
                    <div className="flex-1">
                        <Label.md>Filter Checklist Runs</Label.md>
                        <Paragraph.xs className="text-tertiary">Narrow runs by schedule, item count, and completion.</Paragraph.xs>
                    </div>
                    <Drawer.Close>
                        <Button.Icon variant="ghost" icon={<X />} />
                    </Drawer.Close>
                </Drawer.Header>

                <Drawer.Content>
                    <Tabs defaultTab="filters">
                        <Tabs.List>
                            <Tabs.Tab value="filters"><Label.sm>Filters</Label.sm></Tabs.Tab>
                            <Tabs.Tab value="sort"><Label.sm>Sort</Label.sm></Tabs.Tab>
                        </Tabs.List>
                        <Tabs.Panels>
                            <Tabs.Panel value="filters">
                                <div className="py-2">
                                    <Paragraph.sm className="px-3 py-1.5 text-quaternary">Schedule</Paragraph.sm>
                                    <div className="flex flex-col gap-3 px-3">
                                        <Checkbox checked={state.includePast} onChange={(event) => setIncludePast(event.target.checked)}>
                                            <FormLabel label="Include past runs" />
                                        </Checkbox>
                                        <div className="flex gap-2">
                                            <label className="space-y-1 *:odd:ml-1">
                                                <FormLabel label="Start Date" />
                                                <Input type="date" value={state.dateRange.start} onChange={(event) => setDateRange(event.target.value, state.dateRange.end)} />
                                            </label>
                                            <label className="space-y-1 *:odd:ml-1">
                                                <FormLabel label="End Date" />
                                                <Input type="date" value={state.dateRange.end} onChange={(event) => setDateRange(state.dateRange.start, event.target.value)} />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <Divider className="px-4" />
                                <div className="py-2">
                                    <Paragraph.sm className="px-3 py-1.5 text-quaternary">Completion</Paragraph.sm>
                                    <div className="grid grid-cols-1 gap-2 px-3">
                                        {completionFilters.map((option) => (
                                            <Radio key={option.value} name="checklist-completion" value={option.value} checked={state.completion === option.value} onChange={() => setCompletion(option.value)}>
                                                <FormLabel label={option.label} />
                                            </Radio>
                                        ))}
                                    </div>
                                </div>
                                <Divider className="px-4" />
                                <div className="py-2">
                                    <Paragraph.sm className="px-3 py-1.5 text-quaternary">Checklist Size</Paragraph.sm>
                                    <div className="grid grid-cols-2 gap-2 px-3">
                                        <label className="space-y-1 *:odd:ml-1">
                                            <FormLabel label="Min Items" />
                                            <Input type="number" min={0} value={state.itemCount.min} onChange={(event) => setItemCount(event.target.value, state.itemCount.max)} />
                                        </label>
                                        <label className="space-y-1 *:odd:ml-1">
                                            <FormLabel label="Max Items" />
                                            <Input type="number" min={0} value={state.itemCount.max} onChange={(event) => setItemCount(state.itemCount.min, event.target.value)} />
                                        </label>
                                    </div>
                                </div>
                            </Tabs.Panel>
                            <Tabs.Panel value="sort">
                                <div className="py-2">
                                    <Paragraph.sm className="px-3 py-1.5 text-quaternary">Scheduled Date</Paragraph.sm>
                                    <div className="grid grid-cols-2 gap-2 px-3">
                                        <Radio name="checklist-run-sort" value="scheduledAt-asc" checked={sortValue === 'scheduledAt-asc'} onChange={() => setSort('scheduledAt', 'asc')}><FormLabel label="Ascending" /></Radio>
                                        <Radio name="checklist-run-sort" value="scheduledAt-desc" checked={sortValue === 'scheduledAt-desc'} onChange={() => setSort('scheduledAt', 'desc')}><FormLabel label="Descending" /></Radio>
                                    </div>
                                </div>
                                <Divider className="px-4" />
                                <div className="py-2">
                                    <Paragraph.sm className="px-3 py-1.5 text-quaternary">Name</Paragraph.sm>
                                    <div className="grid grid-cols-2 gap-2 px-3">
                                        <Radio name="checklist-run-sort" value="name-asc" checked={sortValue === 'name-asc'} onChange={() => setSort('name', 'asc')}><FormLabel label="A-Z" /></Radio>
                                        <Radio name="checklist-run-sort" value="name-desc" checked={sortValue === 'name-desc'} onChange={() => setSort('name', 'desc')}><FormLabel label="Z-A" /></Radio>
                                    </div>
                                </div>
                                <Divider className="px-4" />
                                <div className="py-2">
                                    <Paragraph.sm className="px-3 py-1.5 text-quaternary">Checklist Progress</Paragraph.sm>
                                    <div className="grid grid-cols-2 gap-2 px-3">
                                        <Radio name="checklist-run-sort" value="items-asc" checked={sortValue === 'items-asc'} onChange={() => setSort('items', 'asc')}><FormLabel label="Fewest items" /></Radio>
                                        <Radio name="checklist-run-sort" value="items-desc" checked={sortValue === 'items-desc'} onChange={() => setSort('items', 'desc')}><FormLabel label="Most items" /></Radio>
                                        <Radio name="checklist-run-sort" value="completed-asc" checked={sortValue === 'completed-asc'} onChange={() => setSort('completed', 'asc')}><FormLabel label="Least complete" /></Radio>
                                        <Radio name="checklist-run-sort" value="completed-desc" checked={sortValue === 'completed-desc'} onChange={() => setSort('completed', 'desc')}><FormLabel label="Most complete" /></Radio>
                                    </div>
                                </div>
                            </Tabs.Panel>
                        </Tabs.Panels>
                    </Tabs>
                </Drawer.Content>

                <Drawer.Footer className="*:w-full">
                    {hasActiveFilters && <Button variant="secondary" icon={<RotateCcw />} className="w-full" onClick={reset}>Reset</Button>}
                    <Drawer.Close><Button className="w-full">Done</Button></Drawer.Close>
                </Drawer.Footer>
            </Drawer.Panel>
        </Drawer.Portal>
    )
}
