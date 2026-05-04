import { Drawer, useDrawer } from '@/components/overlays/drawer'
import { Modal } from '@/components/overlays/modal'
import { Button } from '@/components/controls/button'
import { Badge } from '@/components/display/badge'
import { Divider } from '@/components/display/divider'
import { Label, Paragraph, Title } from '@/components/display/text'
import { InlineEditableText } from '@/components/form/inline-editable-text'
import { useFeedback } from '@/components/feedback/feedback-provider'
import { CalendarClock, Clock, Layers, Maximize2, Pencil, Trash2, TriangleAlert, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CueSheetEvent } from '@/types/cue-sheet'
import { useCueSheet } from './cue-sheet-provider'
import { EditEventModal } from './edit-event-modal'
import { formatUtcIsoInBrowserTimeZone } from '@/utils/browser-date-time'

function formatDuration(minutes: number) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h === 0) return `${m}min`
    if (m === 0) return `${h}h`
    return `${h}h ${m}min`
}

function formatScheduledAt(scheduledAt?: string) {
    if (!scheduledAt) return null
    return formatUtcIsoInBrowserTimeZone(scheduledAt, { dateStyle: 'medium', timeStyle: 'short' })
}

export function EventDrawer({ event }: { event: CueSheetEvent }) {
    return (
        <Drawer.Portal>
            <Drawer.Backdrop />
            <Drawer.Panel className="max-w-lg">
                <EventDrawerContent event={event} />
            </Drawer.Panel>
        </Drawer.Portal>
    )
}

function EventDrawerContent({ event }: { event: CueSheetEvent }) {
    const { actions: drawerActions } = useDrawer()
    const { state: { tracksByEventId }, actions: { syncEvent, removeEvent } } = useCueSheet()
    const { toast } = useFeedback()
    const navigate = useNavigate()
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [editOpen, setEditOpen] = useState(false)

    const trackCount = tracksByEventId[event.id]?.length ?? 0
    const scheduledAt = formatScheduledAt(event.scheduledAt)

    function handleOpenFullPage() {
        drawerActions.close()
        navigate(`/cue-sheet/events/${event.id}`)
    }

    async function handleDelete() {
        try {
            await removeEvent(event.id)
            toast({ title: 'Event deleted', variant: 'success' })
            setDeleteOpen(false)
            drawerActions.close()
        } catch (error) {
            toast({ title: 'Failed to delete event', description: error instanceof Error ? error.message : 'The event could not be deleted.', variant: 'error' })
        }
    }

    return (
        <>
            <Drawer.Header className="flex items-center gap-1">
                <Button.Icon variant="ghost" icon={<X />} onClick={drawerActions.close} />
                <Button.Icon variant="ghost" icon={<Maximize2 />} onClick={handleOpenFullPage} />
                <Button.Icon variant="ghost" icon={<Pencil />} onClick={() => setEditOpen(true)} />
                <div className="flex-1" />
                <Button.Icon variant="danger-secondary" icon={<Trash2 />} onClick={() => setDeleteOpen(true)} />
            </Drawer.Header>

            <Drawer.Content className="py-4">
                <div className="px-4 pb-2">
                    <Title.h6>
                        <InlineEditableText
                            value={event.title}
                            onSave={(title) => syncEvent({ ...event, title })}
                            className="title-h6"
                        />
                    </Title.h6>
                    <Paragraph.sm className="text-tertiary pt-1">
                        <InlineEditableText
                            value={event.description}
                            onSave={(description) => syncEvent({ ...event, description })}
                            className="text-sm text-tertiary"
                            placeholder="Add description"
                        />
                    </Paragraph.sm>
                </div>

                <Divider className="px-4 py-3" />

                <div className="flex flex-col gap-3 px-4">
                    <div className="flex items-center justify-between gap-4">
                        <Label.sm className="text-tertiary">Scheduled</Label.sm>
                        {scheduledAt
                            ? <Badge label={scheduledAt} icon={<CalendarClock />} color="purple" />
                            : <Paragraph.sm className="text-tertiary">Not scheduled</Paragraph.sm>
                        }
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <Label.sm className="text-tertiary">Duration</Label.sm>
                        <Badge label={formatDuration(event.duration)} icon={<Clock />} variant="outline" />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <Label.sm className="text-tertiary">Tracks</Label.sm>
                        <Badge
                            label={`${trackCount} track${trackCount !== 1 ? 's' : ''}`}
                            icon={<Layers />}
                            color={trackCount > 0 ? 'blue' : 'gray'}
                        />
                    </div>
                    {event.kind === 'instance' && event.templateId && (
                        <div className="flex items-center justify-between gap-4">
                            <Label.sm className="text-tertiary">Kind</Label.sm>
                            <Paragraph.sm className="text-secondary">Run from template</Paragraph.sm>
                        </div>
                    )}
                </div>
            </Drawer.Content>

            <Drawer.Footer className="justify-end">
                <Button variant="secondary" onClick={drawerActions.close}>Close</Button>
                <Button icon={<Maximize2 />} onClick={handleOpenFullPage}>Open timeline</Button>
            </Drawer.Footer>

            <EditEventModal
                open={editOpen}
                onOpenChange={setEditOpen}
                initial={{ title: event.title, description: event.description, duration: event.duration }}
                onSave={(next) => syncEvent({ ...event, ...next })}
            />

            <Modal open={deleteOpen} onOpenChange={setDeleteOpen}>
                <Modal.Portal>
                    <Modal.Backdrop />
                    <Modal.Positioner>
                        <Modal.Panel>
                            <Modal.Header>
                                <Label.md>Delete Event</Label.md>
                            </Modal.Header>
                            <Modal.Content className="p-4 flex-row gap-4">
                                <TriangleAlert className="size-8 shrink-0 text-utility-red-600" />
                                <Paragraph.sm className="text-secondary">
                                    Are you sure you want to delete this event? This action cannot be undone.
                                </Paragraph.sm>
                            </Modal.Content>
                            <Modal.Footer className="justify-end">
                                <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                                <Button variant="danger" onClick={handleDelete}>Delete Event</Button>
                            </Modal.Footer>
                        </Modal.Panel>
                    </Modal.Positioner>
                </Modal.Portal>
            </Modal>
        </>
    )
}
