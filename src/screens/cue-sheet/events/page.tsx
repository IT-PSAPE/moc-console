import { useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Plus, Search, Settings2 } from 'lucide-react'
import { Button } from '@/components/controls/button'
import { Card } from '@/components/display/card'
import { Decision } from '@/components/display/decision'
import { Header } from '@/components/display/header'
import { Label, Paragraph, Title } from '@/components/display/text'
import { EmptyState } from '@/components/feedback/empty-state'
import { Spinner } from '@/components/feedback/spinner'
import { Input } from '@/components/form/input'
import { Drawer } from '@/components/overlays/drawer'
import { Dropdown } from '@/components/overlays/dropdown'
import { EventItem } from '@/features/cue-sheet/event-item'
import { EventRunFilterDrawer } from '@/features/cue-sheet/event-run-filter-drawer'
import { useCueSheet } from '@/features/cue-sheet/cue-sheet-provider'
import { useEventRunFilters } from '@/features/cue-sheet/use-event-run-filters'
import type { CueSheetEvent } from '@/types/cue-sheet'
import { routes } from '@/screens/console-routes'

export function CueSheetEventScreen() {
    const {
        state: { events, tracksByEventId, isLoadingEvents },
        actions: { loadEvents, createEventInstance },
    } = useCueSheet()
    const navigate = useNavigate()

    useEffect(() => {
        loadEvents()
    }, [loadEvents])

    const eventTemplates = useMemo(() => events.filter((event) => event.kind === 'template'), [events])
    const eventRuns = useMemo(() => events.filter((event) => event.kind === 'instance'), [events])
    const eventFilters = useEventRunFilters(eventRuns, tracksByEventId)
    const { filtered, filters, setSearch } = eventFilters

    const handleCreateRun = useCallback(async (template: CueSheetEvent) => {
        const instance = await createEventInstance(template)
        navigate(`/cue-sheet/events/${instance.id}`)
    }, [createEventInstance, navigate])

    const handleOpenTemplates = useCallback(() => {
        navigate(`/${routes.cueSheetTemplates}`)
    }, [navigate])

    return (
        <section>
            <Header.Root className="p-4 pt-8 mx-auto max-w-content">
                <Header.Lead className="gap-2">
                    <Title.h6>Event Runs</Title.h6>
                    <Paragraph.sm className="text-tertiary max-w-2xl">
                        View scheduled cue sheet runs created from event templates.
                    </Paragraph.sm>
                </Header.Lead>
            </Header.Root>

            <Decision.Root value={eventRuns} loading={isLoadingEvents}>
                <Decision.Loading>
                    <div className="flex justify-center py-16">
                        <Spinner size="lg" />
                    </div>
                </Decision.Loading>
                <Decision.Empty>
                    <EmptyState
                        icon={<Calendar />}
                        title="No event runs yet"
                        description="Create a run from a template when you need an editable cue sheet copy."
                        action={
                            <Dropdown.Root placement="bottom">
                                <Dropdown.Trigger>
                                    <Button icon={<Plus />}>Create Run</Button>
                                </Dropdown.Trigger>
                                <Dropdown.Panel>
                                    {eventTemplates.map((event) => (
                                        <Dropdown.Item key={event.id} onSelect={() => void handleCreateRun(event)}>
                                            {event.title}
                                        </Dropdown.Item>
                                    ))}
                                    {eventTemplates.length === 0 && (
                                        <Dropdown.Item onSelect={handleOpenTemplates}>
                                            Create event template
                                        </Dropdown.Item>
                                    )}
                                </Dropdown.Panel>
                            </Dropdown.Root>
                        }
                    />
                </Decision.Empty>
                <Decision.Data>
                    <div className="flex flex-col gap-4 p-4 pt-8 mx-auto w-full max-w-content">
                        <Card.Root>
                            <Card.Header className="gap-1.5 max-mobile:flex-col *:max-mobile:w-full">
                                <div className="flex flex-1 items-center gap-1.5">
                                    <Calendar className="size-4" />
                                    <Label.sm>All Event Runs</Label.sm>
                                </div>
                                <div className="flex items-center gap-1.5 max-mobile:w-full max-mobile:flex-col">
                                    <Input icon={<Search />} placeholder="Search event runs..." className="w-full max-w-sm" value={filters.search} onChange={(event) => setSearch(event.target.value)} />
                                    <Drawer.Root>
                                        <Drawer.Trigger>
                                            <Button icon={<Settings2 />} variant="secondary">Filter</Button>
                                        </Drawer.Trigger>
                                        <EventRunFilterDrawer filters={eventFilters} />
                                    </Drawer.Root>
                                    <Dropdown.Root placement="bottom">
                                        <Dropdown.Trigger>
                                            <Button.Icon variant='secondary' icon={<Plus />} />
                                        </Dropdown.Trigger>
                                        <Dropdown.Panel>
                                            {eventTemplates.map((event) => (
                                                <Dropdown.Item key={event.id} onSelect={() => void handleCreateRun(event)}>
                                                    {event.title}
                                                </Dropdown.Item>
                                            ))}
                                            {eventTemplates.length === 0 && (
                                                <Dropdown.Item onSelect={handleOpenTemplates}>
                                                    Create event template
                                                </Dropdown.Item>
                                            )}
                                        </Dropdown.Panel>
                                    </Dropdown.Root>
                                </div>
                            </Card.Header>
                            <Card.Content ghost className="flex flex-col gap-1.5">
                                {filtered.map((event) => (
                                    <EventItem key={event.id} event={event} />
                                ))}
                                {filtered.length === 0 && (
                                    <div className="py-8 text-center">
                                        <Paragraph.sm className="text-tertiary">No event runs match your filters.</Paragraph.sm>
                                    </div>
                                )}
                            </Card.Content>
                        </Card.Root>
                    </div>
                </Decision.Data>
            </Decision.Root>
        </section>
    )
}
