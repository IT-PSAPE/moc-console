import { useBreadcrumbOverride } from '@/components/navigation/breadcrumb'
import { InlineEditableText } from '@/components/form/inline-editable-text'
import { Button } from '@/components/controls/button'
import { Label, Paragraph } from '@/components/display/text'
import { Modal } from '@/components/overlays/modal'
import { Spinner } from '@/components/feedback/spinner'
import { useFeedback } from '@/components/feedback/feedback-provider'
import { Timeline } from '@/components/timeline'
import { useCueSheet } from '@/features/cue-sheet/cue-sheet-provider'
import { CueModal } from '@/features/cue-sheet/cue-modal'
import { Trash2, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Track } from '@/types/cue-sheet'

export function CueSheetEventDetailScreen() {
    const { id } = useParams<{ id: string }>()
    const {
        state: { eventsById, tracksByEventId },
        actions: { loadEvent, syncTracks, syncEvent, removeEvent },
    } = useCueSheet()
    const { toast } = useFeedback()
    const navigate = useNavigate()
    const [deleteOpen, setDeleteOpen] = useState(false)

    const event = id ? eventsById[id] ?? null : null
    const tracks = id ? tracksByEventId[id] ?? [] : []

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

    return (
        <section className="h-full flex flex-col">
            <Timeline.Root
                tracks={tracks}
                totalMin={event.duration}
                onChange={handleTracksChange}
                className="flex-1 min-h-0"
            >
                <Timeline.Toolbar
                    renderTitle={() => (
                        <div className="flex items-center gap-2">
                            <InlineEditableText
                                value={event.title}
                                onSave={handleTitleChange}
                                className="label-md"
                            />
                            <Button.Icon variant="danger-secondary" icon={<Trash2 />} onClick={() => setDeleteOpen(true)} />
                        </div>
                    )}
                />
                <CueModal />
            </Timeline.Root>
            <Modal.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
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
            </Modal.Root>
        </section>
    )
}
