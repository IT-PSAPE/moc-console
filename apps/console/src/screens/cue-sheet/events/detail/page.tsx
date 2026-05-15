import { useBreadcrumbOverride } from '@moc/ui/components/navigation/breadcrumb'
import { InlineEditableText } from '@moc/ui/components/form/inline-editable-text'
import { Button } from '@moc/ui/components/controls/button'
import { Label, Paragraph } from '@moc/ui/components/display/text'
import { Modal } from '@moc/ui/components/overlays/modal'
import { Dropdown } from '@moc/ui/components/overlays/dropdown'
import { Spinner } from '@moc/ui/components/feedback/spinner'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { Timeline } from '@/components/timeline'
import { useTimeline } from '@/components/timeline/timeline-context'
import { useAuth } from '@/lib/auth-context'
import { useCueSheet } from '@/features/cue-sheet/cue-sheet-provider'
import { CueModal } from '@/features/cue-sheet/cue-modal'
import { EditEventModal } from '@/features/cue-sheet/edit-event-modal'
import { ShareEventModal } from '@/features/cue-sheet/share-event-modal'
import { TopBarActions } from '@/features/topbar'
import { MoreVertical, Pencil, Plus, Share2, Trash2, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Track } from '@moc/types/cue-sheet'

export function CueSheetEventDetailScreen() {
    const { id } = useParams<{ id: string }>()
    const {
        state: { eventsById, tracksByEventId },
        actions: { loadEvent, syncTracks, syncEvent, removeEvent },
    } = useCueSheet()
    const { role } = useAuth()
    const { toast } = useFeedback()
    const navigate = useNavigate()
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [editOpen, setEditOpen] = useState(false)
    const [shareOpen, setShareOpen] = useState(false)

    const event = id ? eventsById[id] ?? null : null
    const tracks = id ? tracksByEventId[id] ?? [] : []
    const canControl = role?.can_update === true
    const canShare = role?.can_update === true

    useBreadcrumbOverride(id ?? '', event?.title)

    useEffect(() => {
        if (!id) return
        loadEvent(id)
    }, [id, loadEvent])

    const handleTracksChange = useCallback((nextTracks: Track[]) => {
        if (!id) return
        syncTracks(id, nextTracks)
    }, [id, syncTracks])

    const handleTitleChange = useCallback((title: string) => {
        if (!event) return
        syncEvent({ ...event, title })
    }, [event, syncEvent])

    const handleEditSave = useCallback(
        (next: { title: string; description: string; duration: number }) => {
            if (!event) return
            syncEvent({ ...event, ...next })
        },
        [event, syncEvent],
    )

    const handleDelete = useCallback(async () => {
        if (!id) return

        try {
            await removeEvent(id)
            toast({ title: 'Event deleted', variant: 'success' })
            navigate('/cue-sheet/events')
        } catch (error) {
            toast({ title: 'Failed to delete event', description: error instanceof Error ? error.message : 'The event could not be deleted.', variant: 'error' })
        }
    }, [id, navigate, removeEvent, toast])

    if (!event) {
        return (
            <section className="flex justify-center py-16 mx-auto max-w-content-sm">
                <Spinner size="lg" />
            </section>
        )
    }

    // Only "instance" events live in events table (templates use event_templates and aren't shareable here)
    const liveSyncEnabled = event.kind === 'instance'

    return (
        <section className="h-full flex flex-col">
            <Timeline
                tracks={tracks}
                totalMin={event.duration}
                onChange={handleTracksChange}
                className="flex-1 min-h-0"
                playbackSync={liveSyncEnabled ? {
                    eventId: event.id,
                    role: canControl ? 'controller' : 'follower',
                    persistToDatabase: canControl,
                } : null}
            >
                <Timeline.Toolbar
                    showAddCue={false}
                    renderTitle={() => (
                        <InlineEditableText
                            value={event.title}
                            onSave={handleTitleChange}
                            className="label-md"
                        />
                    )}
                    renderActions={canShare && liveSyncEnabled ? () => (
                        <Button variant="ghost" icon={<Share2 />} onClick={() => setShareOpen(true)}>
                            Share
                        </Button>
                    ) : undefined}
                />
                <CueModal eventId={event.id} assignmentEnabled={liveSyncEnabled} />

                {canControl && (
                    <TopBarActions>
                        <DetailTopBarActions
                            onEdit={() => setEditOpen(true)}
                            onDelete={() => setDeleteOpen(true)}
                        />
                    </TopBarActions>
                )}
            </Timeline>

            {liveSyncEnabled && (
                <ShareEventModal
                    open={shareOpen}
                    onOpenChange={setShareOpen}
                    eventId={event.id}
                    eventTitle={event.title}
                />
            )}

            <EditEventModal
                open={editOpen}
                onOpenChange={setEditOpen}
                initial={{ title: event.title, description: event.description, duration: event.duration }}
                onSave={handleEditSave}
            />

            <DeleteEventModal
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                onConfirm={handleDelete}
            />
        </section>
    )
}

function DetailTopBarActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
    const { openCreateModal, readOnly } = useTimeline()

    return (
        <>
            {!readOnly && (
                <Button variant="secondary" icon={<Plus />} onClick={() => openCreateModal()}>
                    Add Cue
                </Button>
            )}
            <Dropdown placement="bottom">
                <Dropdown.Trigger>
                    <Button.Icon variant="ghost" icon={<MoreVertical />} />
                </Dropdown.Trigger>
                <Dropdown.Panel>
                    <Dropdown.Item onSelect={onEdit}>
                        <Pencil className="size-4" />
                        Edit
                    </Dropdown.Item>
                    <Dropdown.Separator />
                    <Dropdown.Item onSelect={onDelete}>
                        <Trash2 className="size-4 text-error" />
                        <span className="text-error">Delete</span>
                    </Dropdown.Item>
                </Dropdown.Panel>
            </Dropdown>
        </>
    )
}

function DeleteEventModal({
    open,
    onOpenChange,
    onConfirm,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: () => void
}) {
    return (
        <Modal open={open} onOpenChange={onOpenChange}>
            <Modal.Portal>
                <Modal.Backdrop />
                <Modal.Positioner>
                    <Modal.Panel className="w-full max-w-md">
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
                            <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button variant="danger" onClick={onConfirm}>Delete Event</Button>
                        </Modal.Footer>
                    </Modal.Panel>
                </Modal.Positioner>
            </Modal.Portal>
        </Modal>
    )
}
