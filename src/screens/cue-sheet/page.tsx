import { Card } from '@/components/display/card'
import { Header } from '@/components/display/header'
import { Button } from '@/components/controls/button'
import { Label, Paragraph, TextBlock, Title } from '@/components/display/text'
import { Spinner } from '@/components/feedback/spinner'
import { EmptyState } from '@/components/feedback/empty-state'
import { useCueSheet } from '@/features/cue-sheet/cue-sheet-provider'
import { EventItem } from '@/features/cue-sheet/event-item'
import { ChecklistItemCard } from '@/features/cue-sheet/checklist-item'
import { Dropdown } from '@/components/overlays/dropdown'
import type { CueSheetEvent, Checklist } from '@/types/cue-sheet'
import { routes } from '@/screens/console-routes'
import { Calendar, ListChecks, Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

export function CueSheetOverviewScreen() {
    const {
        state: { events, checklists, isLoadingEvents, isLoadingChecklists },
        actions: { loadEvents, loadChecklists, createEventInstance, createChecklistInstance },
    } = useCueSheet()
    const navigate = useNavigate()

    useEffect(() => {
        loadEvents()
        loadChecklists()
    }, [loadEvents, loadChecklists])

    const eventTemplates = useMemo(() => events.filter((event) => event.kind === 'template'), [events])
    const eventInstances = useMemo(() => events.filter((event) => event.kind === 'instance'), [events])
    const checklistTemplates = useMemo(() => checklists.filter((checklist) => checklist.kind === 'template'), [checklists])
    const checklistInstances = useMemo(() => checklists.filter((checklist) => checklist.kind === 'instance'), [checklists])

    const handleCreateInstance = useCallback(async (template: CueSheetEvent) => {
        const instance = await createEventInstance(template)
        navigate(`/cue-sheet/events/${instance.id}`)
    }, [createEventInstance, navigate])

    const handleCreateChecklistRun = useCallback(async (template: Checklist) => {
        await createChecklistInstance(template)
    }, [createChecklistInstance])

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
                    <Card.Header className="gap-1.5">
                        <Calendar className="size-4" />
                        <Label.sm>Templates</Label.sm>
                    </Card.Header>
                    <Card.Content className="p-4">
                        <TextBlock className="title-h4">{eventTemplates.length + checklistTemplates.length}</TextBlock>
                    </Card.Content>
                </Card.Root>
                <Card.Root>
                    <Card.Header className="gap-1.5">
                        <Calendar className="size-4" />
                        <Label.sm>Event Runs</Label.sm>
                    </Card.Header>
                    <Card.Content className="p-4">
                        <TextBlock className="title-h4">{eventInstances.length}</TextBlock>
                    </Card.Content>
                </Card.Root>
                <Card.Root>
                    <Card.Header className="gap-1.5">
                        <ListChecks className="size-4" />
                        <Label.sm>Checklist Runs</Label.sm>
                    </Card.Header>
                    <Card.Content className="p-4">
                        <TextBlock className="title-h4">{checklistInstances.length}</TextBlock>
                    </Card.Content>
                </Card.Root>
            </div>

            {/* Event Runs */}
            <div className="flex flex-col gap-4 p-4 pt-8 mx-auto w-full max-w-content">
                <Card.Root>
                    <Card.Header className="gap-1.5">
                        <Calendar className="size-4" />
                        <Label.sm className="flex-1">Event Runs</Label.sm>
                        <Dropdown.Root placement="bottom">
                            <Dropdown.Trigger>
                                <Button.Icon variant="secondary" icon={<Plus />} />
                            </Dropdown.Trigger>
                            <Dropdown.Panel>
                                {eventTemplates.map((event) => (
                                    <Dropdown.Item key={event.id} onSelect={() => void handleCreateInstance(event)}>
                                        {event.title}
                                    </Dropdown.Item>
                                ))}
                                {eventTemplates.length === 0 && (
                                    <Dropdown.Item onSelect={handleOpenTemplates}>
                                        Manage event templates
                                    </Dropdown.Item>
                                )}
                            </Dropdown.Panel>
                        </Dropdown.Root>
                    </Card.Header>
                    <Card.Content ghost className="flex flex-col gap-1.5">
                        {isLoadingEvents ? (
                            <div className="flex justify-center py-6"><Spinner /></div>
                        ) : eventInstances.length > 0 ? (
                            eventInstances.map((event) => (
                                <EventItem key={event.id} event={event} />
                            ))
                        ) : (
                            <EmptyState
                                icon={<Calendar />}
                                title="No event runs yet"
                                description="Create a run from a template when you need an editable event copy."
                            />
                        )}
                    </Card.Content>
                </Card.Root>
            </div>

            {/* Checklist Runs */}
            <div className="flex flex-col gap-4 p-4 pt-8 mx-auto w-full max-w-content">
                <Card.Root>
                    <Card.Header className="gap-1.5">
                        <ListChecks className="size-4" />
                        <Label.sm className="flex-1">Checklist Runs</Label.sm>
                        <Dropdown.Root placement="bottom">
                            <Dropdown.Trigger>
                                <Button.Icon variant="secondary" icon={<Plus />} />
                            </Dropdown.Trigger>
                            <Dropdown.Panel>
                                {checklistTemplates.map((checklist) => (
                                    <Dropdown.Item key={checklist.id} onSelect={() => void handleCreateChecklistRun(checklist)}>
                                        {checklist.name}
                                    </Dropdown.Item>
                                ))}
                                {checklistTemplates.length === 0 && (
                                    <Dropdown.Item onSelect={handleOpenTemplates}>
                                        Manage checklist templates
                                    </Dropdown.Item>
                                )}
                            </Dropdown.Panel>
                        </Dropdown.Root>
                    </Card.Header>
                    <Card.Content ghost className="flex flex-col gap-1.5">
                        {isLoadingChecklists ? (
                            <div className="flex justify-center py-6"><Spinner /></div>
                        ) : checklistInstances.length > 0 ? (
                            checklistInstances.map((checklist) => (
                                <ChecklistItemCard key={checklist.id} checklist={checklist} />
                            ))
                        ) : (
                            <EmptyState
                                icon={<ListChecks />}
                                title="No checklist runs yet"
                                description="Create a run from a checklist template when you need an editable preparation copy."
                            />
                        )}
                    </Card.Content>
                </Card.Root>
            </div>

        </section>
    )
}
