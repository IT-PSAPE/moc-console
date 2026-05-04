import { useCallback, useEffect, useMemo, useState } from 'react'
import { randomId } from '@/utils/random-id'
import { Calendar, ListChecks, Plus, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/controls/button'
import { Card } from '@/components/display/card'
import { Header } from '@/components/display/header'
import { Label, Paragraph, Title } from '@/components/display/text'
import { Spinner } from '@/components/feedback/spinner'
import { Input } from '@/components/form/input'
import { Dropdown } from '@/components/overlays/dropdown'
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

    const handleCreateEvent = useCallback(async ({ title, description, duration }: { title: string; description: string; duration: number }) => {
        const now = new Date().toISOString()
        const newEvent: CueSheetEvent = {
            id: randomId(),
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
            id: randomId(),
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
            <Header className="p-4 pt-8 mx-auto max-w-content">
                <Header.Lead className="gap-2">
                    <Title.h6>Cue Sheet Templates</Title.h6>
                    <Paragraph.sm className="text-tertiary max-w-2xl">
                        Manage reusable event timelines and checklist templates in one place.
                    </Paragraph.sm>
                </Header.Lead>
            </Header>

            <div className="flex flex-col gap-4 p-4 pt-8 mx-auto w-full max-w-content">
                <Header className="gap-2 max-mobile:flex-col *:max-mobile:w-full">
                    <Header.Lead className="gap-2">
                        <Label.md>Templates</Label.md>
                    </Header.Lead>
                    <Header.Trail className="gap-2 flex-1 justify-end">
                        <Input icon={<Search />} placeholder="Search templates..." className="w-full max-w-md" value={search} onChange={(event) => setSearch(event.target.value)} />
                        <Dropdown placement="bottom">
                            <Dropdown.Trigger>
                                <Button.Icon variant="secondary" icon={<Plus />} />
                            </Dropdown.Trigger>
                            <Dropdown.Panel>
                                <Dropdown.Item onSelect={() => setShowEventModal(true)}>
                                    <Calendar className="size-4" />
                                    New event template
                                </Dropdown.Item>
                                <Dropdown.Item onSelect={() => setShowChecklistModal(true)}>
                                    <ListChecks className="size-4" />
                                    New checklist template
                                </Dropdown.Item>
                            </Dropdown.Panel>
                        </Dropdown>
                    </Header.Trail>
                </Header>

                <Card>
                    <Card.Header tight className="gap-1.5">
                        <div className="flex flex-1 items-center gap-1.5">
                            <Calendar className="size-4" />
                            <Label.sm>Event Templates</Label.sm>
                        </div>
                    </Card.Header>
                    <Card.Content ghost className="flex flex-col gap-1.5">
                        {isLoading ? (
                            <div className="flex justify-center py-6"><Spinner /></div>
                        ) : filteredEventTemplates.length > 0 ? (
                            filteredEventTemplates.map((event) => (
                                <EventItem key={event.id} event={event} />
                            ))
                        ) : (
                            <div className="py-8 text-center">
                                <Paragraph.sm className="text-tertiary">No event templates found.</Paragraph.sm>
                            </div>
                        )}
                    </Card.Content>
                </Card>

                <Card>
                    <Card.Header tight className="gap-1.5">
                        <div className="flex flex-1 items-center gap-1.5">
                            <ListChecks className="size-4" />
                            <Label.sm>Checklist Templates</Label.sm>
                        </div>
                    </Card.Header>
                    <Card.Content ghost className="flex flex-col gap-1.5">
                        {isLoading ? (
                            <div className="flex justify-center py-6"><Spinner /></div>
                        ) : filteredChecklistTemplates.length > 0 ? (
                            filteredChecklistTemplates.map((checklist) => (
                                <ChecklistItemCard key={checklist.id} checklist={checklist} />
                            ))
                        ) : (
                            <div className="py-8 text-center">
                                <Paragraph.sm className="text-tertiary">No checklist templates found.</Paragraph.sm>
                            </div>
                        )}
                    </Card.Content>
                </Card>
            </div>

            <CreateEventModal open={showEventModal} onOpenChange={setShowEventModal} onCreate={handleCreateEvent} />
            <CreateChecklistModal open={showChecklistModal} onOpenChange={setShowChecklistModal} onCreate={handleCreateChecklist} />
        </section>
    )
}
