import { Button } from '@moc/ui/components/controls/button'
import { Divider } from '@moc/ui/components/display/divider'
import { Label, Paragraph } from '@moc/ui/components/display/text'
import { Checkbox } from '@moc/ui/components/form/checkbox'
import { FormLabel } from '@moc/ui/components/form/form-label'
import { Input } from '@moc/ui/components/form/input'
import { Radio } from '@moc/ui/components/form/radio'
import { Tabs } from '@moc/ui/components/layout/tabs'
import { Drawer } from '@moc/ui/components/overlays/drawer'
import { RotateCcw, X } from 'lucide-react'
import type { EventRunSortDirection, EventRunSortField, useEventRunFilters } from './use-event-run-filters'

type SortRadioProps = {
    field: EventRunSortField
    direction: EventRunSortDirection
    label: string
    selected: boolean
    onSelect: (field: EventRunSortField, direction: EventRunSortDirection) => void
}

function SortRadio({ field, direction, label, selected, onSelect }: SortRadioProps) {
    function handleChange() {
        onSelect(field, direction)
    }

    return (
        <Radio name="event-run-sort" value={`${field}-${direction}`} checked={selected} onChange={handleChange}>
            <FormLabel label={label} />
        </Radio>
    )
}

type EventRunFilterDrawerProps = {
    filters: ReturnType<typeof useEventRunFilters>
}

export function EventRunFilterDrawer({ filters }: EventRunFilterDrawerProps) {
    const { filters: state, hasActiveFilters, reset, setCueCount, setDateRange, setDuration, setIncludePast, setSort, setTrackCount } = filters
    const sortValue = `${state.sortField}-${state.sortDirection}`

    function handleIncludePastChange(event: React.ChangeEvent<HTMLInputElement>) {
        setIncludePast(event.target.checked)
    }

    function handleStartDateChange(event: React.ChangeEvent<HTMLInputElement>) {
        setDateRange(event.target.value, state.dateRange.end)
    }

    function handleEndDateChange(event: React.ChangeEvent<HTMLInputElement>) {
        setDateRange(state.dateRange.start, event.target.value)
    }

    function handleMinTracksChange(event: React.ChangeEvent<HTMLInputElement>) {
        setTrackCount(event.target.value, state.trackCount.max)
    }

    function handleMaxTracksChange(event: React.ChangeEvent<HTMLInputElement>) {
        setTrackCount(state.trackCount.min, event.target.value)
    }

    function handleMinCuesChange(event: React.ChangeEvent<HTMLInputElement>) {
        setCueCount(event.target.value, state.cueCount.max)
    }

    function handleMaxCuesChange(event: React.ChangeEvent<HTMLInputElement>) {
        setCueCount(state.cueCount.min, event.target.value)
    }

    function handleMinMinutesChange(event: React.ChangeEvent<HTMLInputElement>) {
        setDuration(event.target.value, state.duration.max)
    }

    function handleMaxMinutesChange(event: React.ChangeEvent<HTMLInputElement>) {
        setDuration(state.duration.min, event.target.value)
    }

    return (
        <Drawer.Portal>
            <Drawer.Backdrop />
            <Drawer.Panel>
                <Drawer.Header>
                    <div className="flex-1">
                        <Label.md>Filter Event Runs</Label.md>
                        <Paragraph.xs className="text-tertiary">Narrow runs by schedule, timeline size, and duration.</Paragraph.xs>
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
                                        <Checkbox checked={state.includePast} onChange={handleIncludePastChange}>
                                            <FormLabel label="Include past runs" />
                                        </Checkbox>
                                        <div className="flex gap-2">
                                            <label className="space-y-1 *:odd:ml-1">
                                                <FormLabel label="Start Date" />
                                                <Input type="date" value={state.dateRange.start} onChange={handleStartDateChange} />
                                            </label>
                                            <label className="space-y-1 *:odd:ml-1">
                                                <FormLabel label="End Date" />
                                                <Input type="date" value={state.dateRange.end} onChange={handleEndDateChange} />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <Divider className="px-4" />
                                <div className="py-2">
                                    <Paragraph.sm className="px-3 py-1.5 text-quaternary">Timeline Size</Paragraph.sm>
                                    <div className="grid grid-cols-2 gap-2 px-3">
                                        <label className="space-y-1 *:odd:ml-1">
                                            <FormLabel label="Min Tracks" />
                                            <Input type="number" min={0} value={state.trackCount.min} onChange={handleMinTracksChange} />
                                        </label>
                                        <label className="space-y-1 *:odd:ml-1">
                                            <FormLabel label="Max Tracks" />
                                            <Input type="number" min={0} value={state.trackCount.max} onChange={handleMaxTracksChange} />
                                        </label>
                                        <label className="space-y-1 *:odd:ml-1">
                                            <FormLabel label="Min Cues" />
                                            <Input type="number" min={0} value={state.cueCount.min} onChange={handleMinCuesChange} />
                                        </label>
                                        <label className="space-y-1 *:odd:ml-1">
                                            <FormLabel label="Max Cues" />
                                            <Input type="number" min={0} value={state.cueCount.max} onChange={handleMaxCuesChange} />
                                        </label>
                                    </div>
                                </div>
                                <Divider className="px-4" />
                                <div className="py-2">
                                    <Paragraph.sm className="px-3 py-1.5 text-quaternary">Duration</Paragraph.sm>
                                    <div className="grid grid-cols-2 gap-2 px-3">
                                        <label className="space-y-1 *:odd:ml-1">
                                            <FormLabel label="Min Minutes" />
                                            <Input type="number" min={0} value={state.duration.min} onChange={handleMinMinutesChange} />
                                        </label>
                                        <label className="space-y-1 *:odd:ml-1">
                                            <FormLabel label="Max Minutes" />
                                            <Input type="number" min={0} value={state.duration.max} onChange={handleMaxMinutesChange} />
                                        </label>
                                    </div>
                                </div>
                            </Tabs.Panel>
                            <Tabs.Panel value="sort">
                                <div className="py-2">
                                    <Paragraph.sm className="px-3 py-1.5 text-quaternary">Scheduled Date</Paragraph.sm>
                                    <div className="grid grid-cols-2 gap-2 px-3">
                                        <SortRadio field="scheduledAt" direction="asc" label="Ascending" selected={sortValue === 'scheduledAt-asc'} onSelect={setSort} />
                                        <SortRadio field="scheduledAt" direction="desc" label="Descending" selected={sortValue === 'scheduledAt-desc'} onSelect={setSort} />
                                    </div>
                                </div>
                                <Divider className="px-4" />
                                <div className="py-2">
                                    <Paragraph.sm className="px-3 py-1.5 text-quaternary">Name</Paragraph.sm>
                                    <div className="grid grid-cols-2 gap-2 px-3">
                                        <SortRadio field="title" direction="asc" label="A-Z" selected={sortValue === 'title-asc'} onSelect={setSort} />
                                        <SortRadio field="title" direction="desc" label="Z-A" selected={sortValue === 'title-desc'} onSelect={setSort} />
                                    </div>
                                </div>
                                <Divider className="px-4" />
                                <div className="py-2">
                                    <Paragraph.sm className="px-3 py-1.5 text-quaternary">Timeline</Paragraph.sm>
                                    <div className="grid grid-cols-2 gap-2 px-3">
                                        <SortRadio field="tracks" direction="asc" label="Fewest tracks" selected={sortValue === 'tracks-asc'} onSelect={setSort} />
                                        <SortRadio field="tracks" direction="desc" label="Most tracks" selected={sortValue === 'tracks-desc'} onSelect={setSort} />
                                        <SortRadio field="cues" direction="asc" label="Fewest cues" selected={sortValue === 'cues-asc'} onSelect={setSort} />
                                        <SortRadio field="cues" direction="desc" label="Most cues" selected={sortValue === 'cues-desc'} onSelect={setSort} />
                                    </div>
                                </div>
                                <Divider className="px-4" />
                                <div className="py-2">
                                    <Paragraph.sm className="px-3 py-1.5 text-quaternary">Duration</Paragraph.sm>
                                    <div className="grid grid-cols-2 gap-2 px-3">
                                        <SortRadio field="duration" direction="asc" label="Shortest" selected={sortValue === 'duration-asc'} onSelect={setSort} />
                                        <SortRadio field="duration" direction="desc" label="Longest" selected={sortValue === 'duration-desc'} onSelect={setSort} />
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
