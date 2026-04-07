import { Card } from '@/components/display/card'
import { Header } from '@/components/display/header'
import { Button } from '@/components/controls/button'
import { Label, Paragraph, TextBlock, Title } from '@/components/display/text'
import { Decision } from '@/components/display/decision'
import { Spinner } from '@/components/feedback/spinner'
import { EmptyState } from '@/components/feedback/empty-state'
import { useCueSheet } from '@/features/cue-sheet/cue-sheet-provider'
import { CreateEventModal } from '@/features/cue-sheet/create-event-modal'
import { CreateChecklistModal } from '@/features/cue-sheet/create-checklist-modal'
import { EventItem } from '@/features/cue-sheet/event-item'
import { ChecklistItemCard } from '@/features/cue-sheet/checklist-item'
import type { CueSheetEvent, Checklist } from '@/types/cue-sheet'
import { Calendar, ClipboardList, ListChecks, Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function CueSheetOverviewScreen() {
    const {
        state: { events, checklists, isLoadingEvents, isLoadingChecklists },
        actions: { loadEvents, loadChecklists, syncEvent, syncChecklist },
    } = useCueSheet()
    const navigate = useNavigate()

    useEffect(() => {
        loadEvents()
        loadChecklists()
    }, [loadEvents, loadChecklists])

    const [showEventModal, setShowEventModal] = useState(false)
    const [showChecklistModal, setShowChecklistModal] = useState(false)

    const isLoading = isLoadingEvents || isLoadingChecklists
    const hasData = events.length > 0 || checklists.length > 0

    const handleCreateEvent = useCallback(({ title, description, duration }: { title: string; description: string; duration: number }) => {
        const now = new Date().toISOString()
        const newEvent: CueSheetEvent = {
            id: crypto.randomUUID(),
            title,
            description,
            duration,
            createdAt: now,
            updatedAt: now,
        }
        syncEvent(newEvent)
        setShowEventModal(false)
        navigate(`/cue-sheet/events/${newEvent.id}`)
    }, [syncEvent, navigate])

    const handleCreateChecklist = useCallback(({ name, description }: { name: string; description: string }) => {
        const now = new Date().toISOString()
        const newChecklist: Checklist = {
            id: crypto.randomUUID(),
            name,
            description,
            items: [],
            sections: [],
            createdAt: now,
            updatedAt: now,
        }
        syncChecklist(newChecklist)
        setShowChecklistModal(false)
    }, [syncChecklist])

    return (
        <section>
            <Header.Root className="p-4 pt-8 mx-auto max-w-content">
                <Header.Lead className="gap-2">
                    <Title.h6>Cue Sheet</Title.h6>
                    <Paragraph.sm className="text-tertiary max-w-2xl">
                        Manage event templates and preparation checklists.
                    </Paragraph.sm>
                </Header.Lead>
            </Header.Root>

            <Decision.Root value={hasData ? [1] : []} loading={isLoading}>
                <Decision.Loading>
                    <div className="flex justify-center py-16">
                        <Spinner size="lg" />
                    </div>
                </Decision.Loading>
                <Decision.Empty>
                    <EmptyState
                        icon={<ClipboardList />}
                        title="No cue sheet data yet"
                        description="Create events and checklists to get started."
                        action={
                            <div className="flex gap-2">
                                <Button icon={<Plus />} onClick={() => setShowEventModal(true)}>New Event</Button>
                                <Button icon={<Plus />} variant="secondary" onClick={() => setShowChecklistModal(true)}>New Checklist</Button>
                            </div>
                        }
                    />
                </Decision.Empty>
                <Decision.Data>
                    {/* Stat cards */}
                    <div className="grid grid-cols-2 gap-4 p-4 pt-8 mx-auto w-full max-w-content max-mobile:gap-2">
                        <Card.Root>
                            <Card.Header className="gap-1.5">
                                <Calendar className="size-4" />
                                <Label.sm>Event Templates</Label.sm>
                            </Card.Header>
                            <Card.Content className="p-4">
                                <TextBlock className="title-h4">{events.length}</TextBlock>
                            </Card.Content>
                        </Card.Root>
                        <Card.Root>
                            <Card.Header className="gap-1.5">
                                <ListChecks className="size-4" />
                                <Label.sm>Checklists</Label.sm>
                            </Card.Header>
                            <Card.Content className="p-4">
                                <TextBlock className="title-h4">{checklists.length}</TextBlock>
                            </Card.Content>
                        </Card.Root>
                    </div>

                    {/* Events */}
                    <div className="flex flex-col gap-4 p-4 pt-8 mx-auto w-full max-w-content">
                        <Card.Root>
                            <Card.Header className="gap-1.5">
                                <Calendar className="size-4" />
                                <Label.sm className="flex-1">Events</Label.sm>
                                <Button variant="ghost" icon={<Plus />} iconOnly onClick={() => setShowEventModal(true)} />
                            </Card.Header>
                            <Card.Content ghost className="flex flex-col gap-1.5">
                                {events.map((event) => (
                                    <EventItem key={event.id} event={event} />
                                ))}
                                {events.length === 0 && (
                                    <EmptyState
                                        icon={<Calendar />}
                                        title="No events yet"
                                        description="Create your first event template."
                                        action={<Button icon={<Plus />} onClick={() => setShowEventModal(true)}>New Event</Button>}
                                    />
                                )}
                            </Card.Content>
                        </Card.Root>
                    </div>

                    {/* Checklists */}
                    <div className="flex flex-col gap-4 p-4 pt-8 mx-auto w-full max-w-content">
                        <Card.Root>
                            <Card.Header className="gap-1.5">
                                <ListChecks className="size-4" />
                                <Label.sm className="flex-1">Checklists</Label.sm>
                                <Button variant="ghost" icon={<Plus />} iconOnly onClick={() => setShowChecklistModal(true)} />
                            </Card.Header>
                            <Card.Content ghost className="flex flex-col gap-1.5">
                                {checklists.map((checklist) => (
                                    <ChecklistItemCard key={checklist.id} checklist={checklist} />
                                ))}
                                {checklists.length === 0 && (
                                    <EmptyState
                                        icon={<ListChecks />}
                                        title="No checklists yet"
                                        description="Create your first checklist."
                                        action={<Button icon={<Plus />} onClick={() => setShowChecklistModal(true)}>New Checklist</Button>}
                                    />
                                )}
                            </Card.Content>
                        </Card.Root>
                    </div>
                </Decision.Data>
            </Decision.Root>

            <CreateEventModal open={showEventModal} onOpenChange={setShowEventModal} onCreate={handleCreateEvent} />
            <CreateChecklistModal open={showChecklistModal} onOpenChange={setShowChecklistModal} onCreate={handleCreateChecklist} />
        </section>
    )
}
