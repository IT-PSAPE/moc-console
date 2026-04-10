import { useCallback, useEffect, useMemo, useState } from 'react'
import { Calendar, ClipboardList, ListChecks, Plus, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/controls/button'
import { Card } from '@/components/display/card'
import { Decision } from '@/components/display/decision'
import { Header } from '@/components/display/header'
import { Label, Paragraph, Title } from '@/components/display/text'
import { EmptyState } from '@/components/feedback/empty-state'
import { Spinner } from '@/components/feedback/spinner'
import { Input } from '@/components/form/input'
import { ChecklistItemCard } from '@/features/cue-sheet/checklist-item'
import { CreateChecklistModal } from '@/features/cue-sheet/create-checklist-modal'
import { CreateEventModal } from '@/features/cue-sheet/create-event-modal'
import { EventItem } from '@/features/cue-sheet/event-item'
import { useCueSheet } from '@/features/cue-sheet/cue-sheet-provider'
import type { Checklist, CueSheetEvent } from '@/types/cue-sheet'

export function CueSheetTemplatesScreen() {
    const navigate = useNavigate()
    
    const {
        state: { events, checklists, isLoadingEvents, isLoadingChecklists },
        actions: { loadEvents, loadChecklists, syncEvent, syncChecklist },
    } = useCueSheet()

    useEffect(() => {
        loadEvents()
        loadChecklists()
    }, [loadEvents, loadChecklists])

    const [search, setSearch] = useState('')
    const [showEventModal, setShowEventModal] = useState(false)
    const [showChecklistModal, setShowChecklistModal] = useState(false)

    const eventTemplates = useMemo(() => events.filter((event) => event.kind === 'template'), [events])
    const checklistTemplates = useMemo(() => checklists.filter((checklist) => checklist.kind === 'template'), [checklists])

    const filteredEventTemplates = useMemo(() => {
        const query = search.trim().toLowerCase()
        if (!query) return eventTemplates
        return eventTemplates.filter((event) => event.title.toLowerCase().includes(query) || event.description.toLowerCase().includes(query))
    }, [eventTemplates, search])

    const filteredChecklistTemplates = useMemo(() => {
        const query = search.trim().toLowerCase()
        if (!query) return checklistTemplates
        return checklistTemplates.filter((checklist) => checklist.name.toLowerCase().includes(query) || checklist.description.toLowerCase().includes(query))
    }, [checklistTemplates, search])

    const isLoading = isLoadingEvents || isLoadingChecklists
    const hasTemplates = eventTemplates.length > 0 || checklistTemplates.length > 0

    const handleCreateEvent = useCallback(async ({ title, description, duration }: { title: string; description: string; duration: number }) => {
        const now = new Date().toISOString()
        const newEvent: CueSheetEvent = {
            id: crypto.randomUUID(),
            kind: 'template',
            title,
            description,
            duration,
            createdAt: now,
            updatedAt: now,
        }
        await syncEvent(newEvent)
        setShowEventModal(false)
        navigate(`/cue-sheet/events/${newEvent.id}`)
    }, [syncEvent, navigate])

    const handleCreateChecklist = useCallback(async ({ name, description }: { name: string; description: string }) => {
        const now = new Date().toISOString()
        const newChecklist: Checklist = {
            id: crypto.randomUUID(),
            kind: 'template',
            name,
            description,
            items: [],
            sections: [],
            createdAt: now,
            updatedAt: now,
        }
        await syncChecklist(newChecklist)
        setShowChecklistModal(false)
    }, [syncChecklist])

    return (
        <section>
            <Header.Root className="p-4 pt-8 mx-auto max-w-content">
                <Header.Lead className="gap-2">
                    <Title.h6>Cue Sheet Templates</Title.h6>
                    <Paragraph.sm className="text-tertiary max-w-2xl">
                        Manage reusable event timelines and checklist templates in one place.
                    </Paragraph.sm>
                </Header.Lead>
            </Header.Root>

            <Decision.Root value={hasTemplates ? [1] : []} loading={isLoading}>
                <Decision.Loading>
                    <div className="flex justify-center py-16">
                        <Spinner size="lg" />
                    </div>
                </Decision.Loading>
                <Decision.Empty>
                    <EmptyState
                        icon={<ClipboardList />}
                        title="No templates yet"
                        description="Create an event or checklist template to reuse later."
                        action={
                            <div className="flex gap-2">
                                <Button icon={<Plus />} onClick={() => setShowEventModal(true)}>New Event Template</Button>
                                <Button icon={<Plus />} variant="secondary" onClick={() => setShowChecklistModal(true)}>New Checklist Template</Button>
                            </div>
                        }
                    />
                </Decision.Empty>
                <Decision.Data>
                    <div className="flex flex-col gap-4 p-4 pt-8 mx-auto w-full max-w-content">
                        <Header.Root className="gap-2 max-mobile:flex-col *:max-mobile:w-full">
                            <Header.Lead className="gap-2">
                                <Label.md>Templates</Label.md>
                            </Header.Lead>
                            <Header.Trail className="gap-2 flex-1 justify-end">
                                <Input icon={<Search />} placeholder="Search templates..." className="w-full max-w-sm" value={search} onChange={(event) => setSearch(event.target.value)} />
                            </Header.Trail>
                        </Header.Root>

                        <Card.Root>
                            <Card.Header className="gap-1.5">
                                <Calendar className="size-4" />
                                <Label.sm className="mr-auto">Event Templates</Label.sm>
                                <Button.Icon variant="secondary" icon={<Plus />} onClick={() => setShowEventModal(true)} />
                            </Card.Header>
                            <Card.Content ghost className="flex flex-col gap-1.5">
                                {filteredEventTemplates.map((event) => (
                                    <EventItem key={event.id} event={event} />
                                ))}
                                {filteredEventTemplates.length === 0 && (
                                    <div className="py-8 text-center">
                                        <Paragraph.sm className="text-tertiary">No event templates match your search.</Paragraph.sm>
                                    </div>
                                )}
                            </Card.Content>
                        </Card.Root>

                        <Card.Root>
                            <Card.Header className="gap-1.5">
                                <ListChecks className="size-4" />
                                <Label.sm className="mr-auto">Checklist Templates</Label.sm>
                                <Button.Icon variant="secondary" icon={<Plus />} onClick={() => setShowChecklistModal(true)} />
                            </Card.Header>
                            <Card.Content ghost className="flex flex-col gap-1.5">
                                {filteredChecklistTemplates.map((checklist) => (
                                    <ChecklistItemCard key={checklist.id} checklist={checklist} />
                                ))}
                                {filteredChecklistTemplates.length === 0 && (
                                    <div className="py-8 text-center">
                                        <Paragraph.sm className="text-tertiary">No checklist templates match your search.</Paragraph.sm>
                                    </div>
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
