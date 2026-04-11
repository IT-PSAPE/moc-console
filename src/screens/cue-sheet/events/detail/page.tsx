import { useBreadcrumbOverride } from '@/components/navigation/breadcrumb'
import { InlineEditableText } from '@/components/form/inline-editable-text'
import { Spinner } from '@/components/feedback/spinner'
import { Timeline } from '@/components/timeline'
import { useCueSheet } from '@/features/cue-sheet/cue-sheet-provider'
import { CueModal } from '@/features/cue-sheet/cue-modal'
import { useCallback, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import type { Track } from '@/types/cue-sheet'

export function CueSheetEventDetailScreen() {
    const { id } = useParams<{ id: string }>()
    const {
        state: { eventsById, tracksByEventId },
        actions: { loadEvent, syncTracks, syncEvent },
    } = useCueSheet()

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
                        <InlineEditableText
                            value={event.title}
                            onSave={handleTitleChange}
                            className="label-md"
                        />
                    )}
                />
                <CueModal />
            </Timeline.Root>
        </section>
    )
}
