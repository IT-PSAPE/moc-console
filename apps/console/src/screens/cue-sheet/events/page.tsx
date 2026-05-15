import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, FilePlus2, Plus, Search, Settings2 } from 'lucide-react'
import { Button } from '@/components/controls/button'
import { Card } from '@/components/display/card'
import { Header } from '@/components/display/header'
import { Label, Paragraph, Title } from '@/components/display/text'
import { LoadingSpinner } from '@/components/feedback/spinner'
import { Input } from '@/components/form/input'
import { Decision } from '@/components/display/decision'
import { EmptyState } from '@/components/feedback/empty-state'
import { Drawer } from '@/components/overlays/drawer'
import { Dropdown } from '@/components/overlays/dropdown'
import { CreateEventRunModal, type EventRunSubmit } from '@/features/cue-sheet/create-event-run-modal'
import { EventItem } from '@/features/cue-sheet/event-item'
import { EventRunFilterDrawer } from '@/features/cue-sheet/event-run-filter-drawer'
import { useCueSheet } from '@/features/cue-sheet/cue-sheet-provider'
import { partitionEventRuns } from '@/features/cue-sheet/run-status'
import { useEventRunFilters } from '@/features/cue-sheet/use-event-run-filters'
import type { CueSheetEvent } from '@/types/cue-sheet'
import { routes } from '@/screens/console-routes'

export function CueSheetEventScreen() {
    const {
        state: { events, tracksByEventId, isLoadingEvents },
        actions: { loadEvents, createEventInstance, createBlankEvent },
    } = useCueSheet()
    const navigate = useNavigate()
    const [modalOpen, setModalOpen] = useState(false)
    const [modalTemplate, setModalTemplate] = useState<CueSheetEvent | null>(null)

    useEffect(() => {
        loadEvents()
    }, [loadEvents])

    const eventTemplates = useMemo(() => events.filter((event) => event.kind === 'template'), [events])
    const eventRuns = useMemo(() => events.filter((event) => event.kind === 'instance'), [events])
    const eventFilters = useEventRunFilters(eventRuns, tracksByEventId)
    const { filtered, filters, setSearch } = eventFilters
    const { active: activeEventRuns, past: pastEventRuns } = useMemo(() => partitionEventRuns(filtered), [filtered])

    const handlePickBlank = useCallback(() => {
        setModalTemplate(null)
        setModalOpen(true)
    }, [])

    const handlePickTemplate = useCallback((template: CueSheetEvent) => {
        setModalTemplate(template)
        setModalOpen(true)
    }, [])

    const handleSubmit = useCallback(async (input: EventRunSubmit) => {
        const instance = input.kind === 'template'
            ? await createEventInstance(input.template, { title: input.title, description: input.description, scheduledAt: input.scheduledAt })
            : await createBlankEvent({ title: input.title, description: input.description, scheduledAt: input.scheduledAt, duration: input.duration })
        navigate(`/cue-sheet/events/${instance.id}`)
    }, [createBlankEvent, createEventInstance, navigate])

    const handleOpenTemplates = useCallback(() => {
        navigate(`/${routes.cueSheetTemplates}`)
    }, [navigate])

    return (
        <section>
            <Header className="p-4 pt-8 mx-auto max-w-content">
                <Header.Lead className="gap-2">
                    <Title.h6>Event Runs</Title.h6>
                    <Paragraph.sm className="text-tertiary max-w-2xl">
                        View scheduled cue sheet runs created from event templates.
                    </Paragraph.sm>
                </Header.Lead>
            </Header>

            <div className="flex flex-col gap-4 p-4 pt-8 mx-auto w-full max-w-content">
                <Header className="gap-2 max-mobile:flex-col *:max-mobile:w-full">
                    <Header.Lead className="gap-2">
                        <Label.md>Events</Label.md>
                    </Header.Lead>
                    <Header.Trail className="gap-2 flex-1 justify-end">
                        <Input icon={<Search />} placeholder="Search event runs..." className="w-full max-w-md" value={filters.search} onChange={(event) => setSearch(event.target.value)} />
                        <Drawer>
                            <Drawer.Trigger>
                                <Button icon={<Settings2 />} variant="secondary">Filter</Button>
                            </Drawer.Trigger>
                            <EventRunFilterDrawer filters={eventFilters} />
                        </Drawer>
                        <Dropdown placement="bottom">
                            <Dropdown.Trigger>
                                <Button.Icon variant='secondary' icon={<Plus />} />
                            </Dropdown.Trigger>
                            <Dropdown.Panel>
                                <Dropdown.Item onSelect={handlePickBlank}>
                                    <FilePlus2 className="size-4" />
                                    Blank event
                                </Dropdown.Item>
                                {eventTemplates.length > 0 && <Dropdown.Separator />}
                                {eventTemplates.map((event) => (
                                    <Dropdown.Item key={event.id} onSelect={() => handlePickTemplate(event)}>
                                        {event.title}
                                    </Dropdown.Item>
                                ))}
                                {eventTemplates.length === 0 && (
                                    <Dropdown.Item onSelect={handleOpenTemplates}>
                                        Manage event templates
                                    </Dropdown.Item>
                                )}
                            </Dropdown.Panel>
                        </Dropdown>
                    </Header.Trail>
                </Header>

                <Card>
                    <Card.Header tight className="gap-1.5">
                        <div className="flex flex-1 items-center gap-1.5">
                            <Calendar className="size-4" />
                            <Label.sm>Current</Label.sm>
                        </div>
                    </Card.Header>
                    <Card.Content ghost className="flex flex-col gap-1.5">
                        <Decision value={activeEventRuns} loading={isLoadingEvents}>
                            <Decision.Loading>
                                <LoadingSpinner className="py-6" />
                            </Decision.Loading>
                            <Decision.Empty>
                                <EmptyState
                                    icon={<Calendar />}
                                    title={filters.search.trim() ? "No current event runs match your search" : "No current event runs"}
                                    description={filters.search.trim() ? "Try a different search term." : "Schedule an event run to see it here."}
                                />
                            </Decision.Empty>
                            <Decision.Data>
                                {activeEventRuns.map((event) => (
                                    <EventItem key={event.id} event={event} />
                                ))}
                            </Decision.Data>
                        </Decision>
                    </Card.Content>
                </Card>

                <Card>
                    <Card.Header tight className="gap-1.5">
                        <div className="flex flex-1 items-center gap-1.5">
                            <Calendar className="size-4" />
                            <Label.sm>Past</Label.sm>
                        </div>
                    </Card.Header>
                    <Card.Content ghost className="flex flex-col gap-1.5">
                        <Decision value={pastEventRuns} loading={isLoadingEvents}>
                            <Decision.Loading>
                                <LoadingSpinner className="py-6" />
                            </Decision.Loading>
                            <Decision.Empty>
                                <EmptyState
                                    icon={<Calendar />}
                                    title={filters.search.trim() ? "No past event runs match your search" : "No past event runs"}
                                    description={filters.search.trim() ? "Try a different search term." : "Completed event runs will appear here."}
                                />
                            </Decision.Empty>
                            <Decision.Data>
                                {pastEventRuns.map((event) => (
                                    <EventItem key={event.id} event={event} />
                                ))}
                            </Decision.Data>
                        </Decision>
                    </Card.Content>
                </Card>
            </div>

            <CreateEventRunModal open={modalOpen} onOpenChange={setModalOpen} template={modalTemplate} onSubmit={handleSubmit} />
        </section>
    )
}
