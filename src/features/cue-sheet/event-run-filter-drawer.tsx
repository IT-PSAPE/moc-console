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
import type { useEventRunFilters } from './use-event-run-filters'

type EventRunFilterDrawerProps = {
    filters: ReturnType<typeof useEventRunFilters>
}

export function EventRunFilterDrawer({ filters }: EventRunFilterDrawerProps) {
    const { filters: state, hasActiveFilters, reset, setCueCount, setDateRange, setDuration, setIncludePast, setSort, setTrackCount } = filters
    const sortValue = `${state.sortField}-${state.sortDirection}`

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
                    <Tabs.Root defaultTab="filters">
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
                                    <Paragraph.sm className="px-3 py-1.5 text-quaternary">Timeline Size</Paragraph.sm>
                                    <div className="grid grid-cols-2 gap-2 px-3">
                                        <label className="space-y-1 *:odd:ml-1">
                                            <FormLabel label="Min Tracks" />
                                            <Input type="number" min={0} value={state.trackCount.min} onChange={(event) => setTrackCount(event.target.value, state.trackCount.max)} />
                                        </label>
                                        <label className="space-y-1 *:odd:ml-1">
                                            <FormLabel label="Max Tracks" />
                                            <Input type="number" min={0} value={state.trackCount.max} onChange={(event) => setTrackCount(state.trackCount.min, event.target.value)} />
                                        </label>
                                        <label className="space-y-1 *:odd:ml-1">
                                            <FormLabel label="Min Cues" />
                                            <Input type="number" min={0} value={state.cueCount.min} onChange={(event) => setCueCount(event.target.value, state.cueCount.max)} />
                                        </label>
                                        <label className="space-y-1 *:odd:ml-1">
                                            <FormLabel label="Max Cues" />
                                            <Input type="number" min={0} value={state.cueCount.max} onChange={(event) => setCueCount(state.cueCount.min, event.target.value)} />
                                        </label>
                                    </div>
                                </div>
                                <Divider className="px-4" />
                                <div className="py-2">
                                    <Paragraph.sm className="px-3 py-1.5 text-quaternary">Duration</Paragraph.sm>
                                    <div className="grid grid-cols-2 gap-2 px-3">
                                        <label className="space-y-1 *:odd:ml-1">
                                            <FormLabel label="Min Minutes" />
                                            <Input type="number" min={0} value={state.duration.min} onChange={(event) => setDuration(event.target.value, state.duration.max)} />
                                        </label>
                                        <label className="space-y-1 *:odd:ml-1">
                                            <FormLabel label="Max Minutes" />
                                            <Input type="number" min={0} value={state.duration.max} onChange={(event) => setDuration(state.duration.min, event.target.value)} />
                                        </label>
                                    </div>
                                </div>
                            </Tabs.Panel>
                            <Tabs.Panel value="sort">
                                <div className="py-2">
                                    <Paragraph.sm className="px-3 py-1.5 text-quaternary">Scheduled Date</Paragraph.sm>
                                    <div className="grid grid-cols-2 gap-2 px-3">
                                        <Radio name="event-run-sort" value="scheduledAt-asc" checked={sortValue === 'scheduledAt-asc'} onChange={() => setSort('scheduledAt', 'asc')}><FormLabel label="Ascending" /></Radio>
                                        <Radio name="event-run-sort" value="scheduledAt-desc" checked={sortValue === 'scheduledAt-desc'} onChange={() => setSort('scheduledAt', 'desc')}><FormLabel label="Descending" /></Radio>
                                    </div>
                                </div>
                                <Divider className="px-4" />
                                <div className="py-2">
                                    <Paragraph.sm className="px-3 py-1.5 text-quaternary">Name</Paragraph.sm>
                                    <div className="grid grid-cols-2 gap-2 px-3">
                                        <Radio name="event-run-sort" value="title-asc" checked={sortValue === 'title-asc'} onChange={() => setSort('title', 'asc')}><FormLabel label="A-Z" /></Radio>
                                        <Radio name="event-run-sort" value="title-desc" checked={sortValue === 'title-desc'} onChange={() => setSort('title', 'desc')}><FormLabel label="Z-A" /></Radio>
                                    </div>
                                </div>
                                <Divider className="px-4" />
                                <div className="py-2">
                                    <Paragraph.sm className="px-3 py-1.5 text-quaternary">Timeline</Paragraph.sm>
                                    <div className="grid grid-cols-2 gap-2 px-3">
                                        <Radio name="event-run-sort" value="tracks-asc" checked={sortValue === 'tracks-asc'} onChange={() => setSort('tracks', 'asc')}><FormLabel label="Fewest tracks" /></Radio>
                                        <Radio name="event-run-sort" value="tracks-desc" checked={sortValue === 'tracks-desc'} onChange={() => setSort('tracks', 'desc')}><FormLabel label="Most tracks" /></Radio>
                                        <Radio name="event-run-sort" value="cues-asc" checked={sortValue === 'cues-asc'} onChange={() => setSort('cues', 'asc')}><FormLabel label="Fewest cues" /></Radio>
                                        <Radio name="event-run-sort" value="cues-desc" checked={sortValue === 'cues-desc'} onChange={() => setSort('cues', 'desc')}><FormLabel label="Most cues" /></Radio>
                                    </div>
                                </div>
                                <Divider className="px-4" />
                                <div className="py-2">
                                    <Paragraph.sm className="px-3 py-1.5 text-quaternary">Duration</Paragraph.sm>
                                    <div className="grid grid-cols-2 gap-2 px-3">
                                        <Radio name="event-run-sort" value="duration-asc" checked={sortValue === 'duration-asc'} onChange={() => setSort('duration', 'asc')}><FormLabel label="Shortest" /></Radio>
                                        <Radio name="event-run-sort" value="duration-desc" checked={sortValue === 'duration-desc'} onChange={() => setSort('duration', 'desc')}><FormLabel label="Longest" /></Radio>
                                    </div>
                                </div>
                            </Tabs.Panel>
                        </Tabs.Panels>
                    </Tabs.Root>
                </Drawer.Content>

                <Drawer.Footer className="*:w-full">
                    {hasActiveFilters && <Button variant="secondary" icon={<RotateCcw />} className="w-full" onClick={reset}>Reset</Button>}
                    <Drawer.Close><Button className="w-full">Done</Button></Drawer.Close>
                </Drawer.Footer>
            </Drawer.Panel>
        </Drawer.Portal>
    )
}
