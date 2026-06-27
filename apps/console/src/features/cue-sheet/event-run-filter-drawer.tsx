import { Button } from '@moc/ui/components/controls/button'
import { Divider } from '@moc/ui/components/display/divider'
import { Label, Paragraph } from '@moc/ui/components/display/text'
import { Checkbox } from '@moc/ui/components/form/checkbox'
import { FormLabel } from '@moc/ui/components/form/form-label'
import { Input } from '@moc/ui/components/form/input'
import { Radio, RadioGroup } from '@moc/ui/components/form/radio'
import { Tabs } from '@moc/ui/components/layout/tabs'
import { Drawer } from '@moc/ui/components/overlays/drawer'
import { RotateCcw, X } from 'lucide-react'
import type { EventRunSortDirection, EventRunSortField, useEventRunFilters } from './use-event-run-filters'

type SortRadioProps = {
    field: EventRunSortField
    direction: EventRunSortDirection
    label: string
}

function SortRadio({ field, direction, label }: SortRadioProps) {
    return (
        <Radio value={`${field}-${direction}`}>
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
                                <RadioGroup
                                    value={sortValue}
                                    onValueChange={(value) => {
                                        const i = value.lastIndexOf("-");
                                        setSort(value.slice(0, i) as Parameters<typeof setSort>[0], value.slice(i + 1) as Parameters<typeof setSort>[1]);
                                    }}
                                >
                                <div className="py-2">
                                    <Paragraph.sm className="px-3 py-1.5 text-quaternary">Scheduled Date</Paragraph.sm>
                                    <div className="grid grid-cols-2 gap-2 px-3">
                                        <SortRadio field="scheduledAt" direction="asc" label="Ascending" />
                                        <SortRadio field="scheduledAt" direction="desc" label="Descending" />
                                    </div>
                                </div>
                                <Divider className="px-4" />
                                <div className="py-2">
                                    <Paragraph.sm className="px-3 py-1.5 text-quaternary">Name</Paragraph.sm>
                                    <div className="grid grid-cols-2 gap-2 px-3">
                                        <SortRadio field="title" direction="asc" label="A-Z" />
                                        <SortRadio field="title" direction="desc" label="Z-A" />
                                    </div>
                                </div>
                                <Divider className="px-4" />
                                <div className="py-2">
                                    <Paragraph.sm className="px-3 py-1.5 text-quaternary">Timeline</Paragraph.sm>
                                    <div className="grid grid-cols-2 gap-2 px-3">
                                        <SortRadio field="tracks" direction="asc" label="Fewest tracks" />
                                        <SortRadio field="tracks" direction="desc" label="Most tracks" />
                                        <SortRadio field="cues" direction="asc" label="Fewest cues" />
                                        <SortRadio field="cues" direction="desc" label="Most cues" />
                                    </div>
                                </div>
                                <Divider className="px-4" />
                                <div className="py-2">
                                    <Paragraph.sm className="px-3 py-1.5 text-quaternary">Duration</Paragraph.sm>
                                    <div className="grid grid-cols-2 gap-2 px-3">
                                        <SortRadio field="duration" direction="asc" label="Shortest" />
                                        <SortRadio field="duration" direction="desc" label="Longest" />
                                    </div>
                                </div>
                                </RadioGroup>
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
