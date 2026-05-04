import { Card } from '@/components/display/card'
import { Header } from '@/components/display/header'
import { Button } from '@/components/controls/button'
import { Input } from '@/components/form/input'
import { Label, Paragraph, TextBlock, Title } from '@/components/display/text'
import { Spinner } from '@/components/feedback/spinner'
import { EmptyState } from '@/components/feedback/empty-state'
import { useCueSheet } from '@/features/cue-sheet/cue-sheet-provider'
import { CreateChecklistRunModal, type ChecklistRunSubmit } from '@/features/cue-sheet/create-checklist-run-modal'
import { CreateEventRunModal, type EventRunSubmit } from '@/features/cue-sheet/create-event-run-modal'
import { EventItem } from '@/features/cue-sheet/event-item'
import { ChecklistItemCard } from '@/features/cue-sheet/checklist-item'
import { Dropdown } from '@/components/overlays/dropdown'
import type { CueSheetEvent, Checklist } from '@/types/cue-sheet'
import { routes } from '@/screens/console-routes'
import { isChecklistRunPastOrComplete, isEventRunPast, sortOverviewChecklistRuns, sortOverviewEventRuns } from '@/features/cue-sheet/run-status'
import { Calendar, ListChecks, Plus, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function CueSheetOverviewScreen() {
    const {
        state: { events, checklists, isLoadingEvents, isLoadingChecklists },
        actions: { loadEvents, loadChecklists, createEventInstance, createBlankEvent, createChecklistInstance, createBlankChecklist },
    } = useCueSheet()
    const navigate = useNavigate()
    const [eventModalOpen, setEventModalOpen] = useState(false)
    const [eventModalTemplate, setEventModalTemplate] = useState<CueSheetEvent | null>(null)
    const [checklistModalOpen, setChecklistModalOpen] = useState(false)
    const [checklistModalTemplate, setChecklistModalTemplate] = useState<Checklist | null>(null)
    const [search, setSearch] = useState('')

    useEffect(() => {
        loadEvents()
        loadChecklists()
    }, [loadEvents, loadChecklists])

    const eventTemplates = useMemo(() => events.filter((event) => event.kind === 'template'), [events])
    const eventInstances = useMemo(() => events.filter((event) => event.kind === 'instance'), [events])
    const checklistTemplates = useMemo(() => checklists.filter((checklist) => checklist.kind === 'template'), [checklists])
    const checklistInstances = useMemo(() => checklists.filter((checklist) => checklist.kind === 'instance'), [checklists])
    const [now] = useState(() => Date.now())
    const upcomingEventRuns = useMemo(
        () => sortOverviewEventRuns(eventInstances.filter((event) => !isEventRunPast(event, now))),
        [eventInstances, now],
    )
    const upcomingChecklistRuns = useMemo(
        () => sortOverviewChecklistRuns(checklistInstances.filter((checklist) => !isChecklistRunPastOrComplete(checklist, now))),
        [checklistInstances, now],
    )
    const overviewEventRuns = useMemo(() => {
        const query = search.trim().toLowerCase()
        if (!query) return upcomingEventRuns
        return upcomingEventRuns.filter((event) =>
            event.title.toLowerCase().includes(query) || event.description.toLowerCase().includes(query),
        )
    }, [upcomingEventRuns, search])
    const overviewChecklistRuns = useMemo(() => {
        const query = search.trim().toLowerCase()
        if (!query) return upcomingChecklistRuns
        return upcomingChecklistRuns.filter((checklist) =>
            checklist.name.toLowerCase().includes(query) || checklist.description.toLowerCase().includes(query),
        )
    }, [upcomingChecklistRuns, search])

    const handlePickBlankEvent = useCallback(() => {
        setEventModalTemplate(null)
        setEventModalOpen(true)
    }, [])

    const handlePickEventTemplate = useCallback((template: CueSheetEvent) => {
        setEventModalTemplate(template)
        setEventModalOpen(true)
    }, [])

    const handleEventSubmit = useCallback(async (input: EventRunSubmit) => {
        const instance = input.kind === 'template'
            ? await createEventInstance(input.template, { title: input.title, description: input.description, scheduledAt: input.scheduledAt })
            : await createBlankEvent({ title: input.title, description: input.description, scheduledAt: input.scheduledAt, duration: input.duration })
        navigate(`/cue-sheet/events/${instance.id}`)
    }, [createBlankEvent, createEventInstance, navigate])

    const handlePickBlankChecklist = useCallback(() => {
        setChecklistModalTemplate(null)
        setChecklistModalOpen(true)
    }, [])

    const handlePickChecklistTemplate = useCallback((template: Checklist) => {
        setChecklistModalTemplate(template)
        setChecklistModalOpen(true)
    }, [])

    const handleChecklistSubmit = useCallback(async (input: ChecklistRunSubmit) => {
        if (input.kind === 'template') {
            await createChecklistInstance(input.template, { name: input.name, description: input.description, scheduledAt: input.scheduledAt })
        } else {
            await createBlankChecklist({ name: input.name, description: input.description, scheduledAt: input.scheduledAt })
        }
    }, [createBlankChecklist, createChecklistInstance])

    const handleOpenTemplates = useCallback(() => {
        navigate(`/${routes.cueSheetTemplates}`)
    }, [navigate])

    return (
        <section>
            <Header.Root className="p-4 pt-8 mx-auto max-w-content">
                <Header.Lead className="gap-2">
                    <Title.h6>Cue Sheet</Title.h6>
                    <Paragraph.sm className="text-tertiary max-w-2xl">
                        Manage upcoming event and checklist runs from reusable templates.
                    </Paragraph.sm>
                </Header.Lead>
            </Header.Root>

            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-4 p-4 pt-8 mx-auto w-full max-w-content max-mobile:grid-cols-2 max-mobile:gap-2">
                <Card.Root>
                    <Card.Header tight className="gap-1.5">
                        <Calendar className="size-4" />
                        <Label.sm>Templates</Label.sm>
                    </Card.Header>
                    <Card.Content className="p-4">
                        <TextBlock className="title-h4">{eventTemplates.length + checklistTemplates.length}</TextBlock>
                    </Card.Content>
                </Card.Root>
                <Card.Root>
                    <Card.Header tight className="gap-1.5">
                        <Calendar className="size-4" />
                        <Label.sm>Event Runs</Label.sm>
                    </Card.Header>
                    <Card.Content className="p-4">
                        <TextBlock className="title-h4">{upcomingEventRuns.length}</TextBlock>
                    </Card.Content>
                </Card.Root>
                <Card.Root>
                    <Card.Header tight className="gap-1.5">
                        <ListChecks className="size-4" />
                        <Label.sm>Checklist Runs</Label.sm>
                    </Card.Header>
                    <Card.Content className="p-4">
                        <TextBlock className="title-h4">{upcomingChecklistRuns.length}</TextBlock>
                    </Card.Content>
                </Card.Root>
            </div>

            <div className="flex flex-col gap-4 p-4 pt-8 mx-auto w-full max-w-content">
                <Header.Root className="gap-2 max-mobile:flex-col *:max-mobile:w-full">
                    <Header.Lead className="gap-2">
                        <Label.md>Q Sheets</Label.md>
                    </Header.Lead>
                    <Header.Trail className="gap-2 flex-1 justify-end">
                        <Input
                            icon={<Search />}
                            placeholder="Search runs..."
                            className="w-full max-w-md"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <Dropdown.Root placement="bottom">
                            <Dropdown.Trigger>
                                <Button.Icon variant="secondary" icon={<Plus />} />
                            </Dropdown.Trigger>
                            <Dropdown.Panel>
                                <Dropdown.Item onSelect={handlePickBlankEvent}>
                                    <Calendar className="size-4" />
                                    Blank event run
                                </Dropdown.Item>
                                <Dropdown.Item onSelect={handlePickBlankChecklist}>
                                    <ListChecks className="size-4" />
                                    Blank checklist run
                                </Dropdown.Item>
                                {(eventTemplates.length > 0 || checklistTemplates.length > 0) && <Dropdown.Separator />}
                                {eventTemplates.map((event) => (
                                    <Dropdown.Item key={event.id} onSelect={() => handlePickEventTemplate(event)}>
                                        <Calendar className="size-4" />
                                        {event.title}
                                    </Dropdown.Item>
                                ))}
                                {checklistTemplates.map((checklist) => (
                                    <Dropdown.Item key={checklist.id} onSelect={() => handlePickChecklistTemplate(checklist)}>
                                        <ListChecks className="size-4" />
                                        {checklist.name}
                                    </Dropdown.Item>
                                ))}
                                {eventTemplates.length === 0 && checklistTemplates.length === 0 && (
                                    <>
                                        <Dropdown.Separator />
                                        <Dropdown.Item onSelect={handleOpenTemplates}>
                                            Manage templates
                                        </Dropdown.Item>
                                    </>
                                )}
                            </Dropdown.Panel>
                        </Dropdown.Root>
                    </Header.Trail>
                </Header.Root>

                <Card.Root>
                    <Card.Header tight className="gap-1.5">
                        <div className="flex flex-1 items-center gap-1.5">
                            <Calendar className="size-4" />
                            <Label.sm>Event Runs</Label.sm>
                        </div>
                    </Card.Header>
                    <Card.Content ghost className="flex flex-col gap-1.5">
                        {isLoadingEvents ? (
                            <div className="flex justify-center py-6"><Spinner /></div>
                        ) : overviewEventRuns.length > 0 ? (
                            overviewEventRuns.map((event) => (
                                <EventItem key={event.id} event={event} />
                            ))
                        ) : (
                            <EmptyState
                                icon={<Calendar />}
                                title={search.trim() ? 'No event runs match your search' : 'No event runs yet'}
                                description={search.trim() ? 'Try a different search term.' : 'Create a run from a template when you need an editable event copy.'}
                            />
                        )}
                    </Card.Content>
                </Card.Root>

                <Card.Root>
                    <Card.Header tight className="gap-1.5">
                        <div className="flex flex-1 items-center gap-1.5">
                            <ListChecks className="size-4" />
                            <Label.sm>Checklist Runs</Label.sm>
                        </div>
                    </Card.Header>
                    <Card.Content ghost className="flex flex-col gap-1.5">
                        {isLoadingChecklists ? (
                            <div className="flex justify-center py-6"><Spinner /></div>
                        ) : overviewChecklistRuns.length > 0 ? (
                            overviewChecklistRuns.map((checklist) => (
                                <ChecklistItemCard key={checklist.id} checklist={checklist} />
                            ))
                        ) : (
                            <EmptyState
                                icon={<ListChecks />}
                                title={search.trim() ? 'No checklist runs match your search' : 'No checklist runs yet'}
                                description={search.trim() ? 'Try a different search term.' : 'Create a run from a checklist template when you need an editable preparation copy.'}
                            />
                        )}
                    </Card.Content>
                </Card.Root>
            </div>

            <CreateEventRunModal open={eventModalOpen} onOpenChange={setEventModalOpen} template={eventModalTemplate} onSubmit={handleEventSubmit} />
            <CreateChecklistRunModal open={checklistModalOpen} onOpenChange={setChecklistModalOpen} template={checklistModalTemplate} onSubmit={handleChecklistSubmit} />
        </section>
    )
}
