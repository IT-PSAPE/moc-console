import { Card } from '@/components/display/card'
import { Header } from '@/components/display/header'
import { Input } from '@/components/form/input'
import { Button } from '@/components/controls/button'
import { Label, Paragraph, Title } from '@/components/display/text'
import { Decision } from '@/components/display/decision'
import { Spinner } from '@/components/feedback/spinner'
import { EmptyState } from '@/components/feedback/empty-state'
import { useCueSheet } from '@/features/cue-sheet/cue-sheet-provider'
import { CreateEventModal } from '@/features/cue-sheet/create-event-modal'
import { EventItem } from '@/features/cue-sheet/event-item'
import type { CueSheetEvent } from '@/types/cue-sheet'
import { Calendar, Plus, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function CueSheetEventScreen() {
    const {
        state: { events, isLoadingEvents },
        actions: { loadEvents, syncEvent },
    } = useCueSheet()
    const navigate = useNavigate()

    useEffect(() => {
        loadEvents()
    }, [loadEvents])

    const [search, setSearch] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)

    const filtered = useMemo(() => {
        if (!search.trim()) return events
        const q = search.toLowerCase()
        return events.filter(
            (e) => e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q),
        )
    }, [events, search])

    const handleCreate = useCallback(async ({ title, description, duration }: { title: string; description: string; duration: number }) => {
        const now = new Date().toISOString()
        const newEvent: CueSheetEvent = {
            id: crypto.randomUUID(),
            title,
            description,
            duration,
            createdAt: now,
            updatedAt: now,
        }
        await syncEvent(newEvent)
        setShowCreateModal(false)
        navigate(`/cue-sheet/events/${newEvent.id}`)
    }, [syncEvent, navigate])

    return (
        <section>
            <Header.Root className="p-4 pt-8 mx-auto max-w-content">
                <Header.Lead className="gap-2">
                    <Title.h6>Events</Title.h6>
                    <Paragraph.sm className="text-tertiary max-w-2xl">
                        Browse and manage event templates. Click an event to view its cue sheet timeline.
                    </Paragraph.sm>
                </Header.Lead>
            </Header.Root>

            <Decision.Root value={events} loading={isLoadingEvents}>
                <Decision.Loading>
                    <div className="flex justify-center py-16">
                        <Spinner size="lg" />
                    </div>
                </Decision.Loading>
                <Decision.Empty>
                    <EmptyState
                        icon={<Calendar />}
                        title="No events yet"
                        description="Create your first event template to get started."
                        action={<Button icon={<Plus />} onClick={() => setShowCreateModal(true)}>New Event</Button>}
                    />
                </Decision.Empty>
                <Decision.Data>
                    <div className="flex flex-col gap-4 p-4 pt-8 mx-auto w-full max-w-content">
                        <Header.Root className="gap-2 max-mobile:flex-col *:max-mobile:w-full">
                            <Header.Lead className="gap-2">
                                <Label.md>All Events</Label.md>
                            </Header.Lead>
                            <Header.Trail className="gap-2 flex-1 justify-end">
                                <Input
                                    icon={<Search />}
                                    placeholder="Search events..."
                                    className="w-full max-w-sm"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </Header.Trail>
                        </Header.Root>

                        <Card.Root>
                            <Card.Header className="gap-1.5">
                                <Calendar className="size-4" />
                                <Label.sm className='mr-auto'>Events</Label.sm>
                                <Button icon={<Plus />} onClick={() => setShowCreateModal(true)}>New Event</Button>
                            </Card.Header>
                            <Card.Content ghost className="flex flex-col gap-1.5">
                                {filtered.map((event) => (
                                    <EventItem key={event.id} event={event} />
                                ))}
                                {filtered.length === 0 && (
                                    <div className="py-8 text-center">
                                        <Paragraph.sm className="text-tertiary">No events match your search.</Paragraph.sm>
                                    </div>
                                )}
                            </Card.Content>
                        </Card.Root>
                    </div>
                </Decision.Data>
            </Decision.Root>

            <CreateEventModal open={showCreateModal} onOpenChange={setShowCreateModal} onCreate={handleCreate} />
        </section>
    )
}
