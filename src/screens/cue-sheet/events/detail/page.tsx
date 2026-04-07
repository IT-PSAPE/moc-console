import { useBreadcrumbOverride } from '@/components/navigation/breadcrumb'
import { Divider } from '@/components/display/divider'
import { Header } from '@/components/display/header'
import { Label, Paragraph, Title } from '@/components/display/text'
import { Spinner } from '@/components/feedback/spinner'
import { Badge } from '@/components/display/badge'
import { useCueSheet } from '@/features/cue-sheet/cue-sheet-provider'
import { EventTimeline } from '@/features/cue-sheet/event-timeline'
import { Clock, Layers } from 'lucide-react'
import { useEffect } from 'react'
import { useParams } from 'react-router-dom'

function formatDuration(minutes: number) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h === 0) return `${m} min`
    if (m === 0) return `${h}h`
    return `${h}h ${m}min`
}

export function CueSheetEventDetailScreen() {
    const { id } = useParams<{ id: string }>()
    const {
        state: { eventsById, tracksByEventId },
        actions: { loadEvent, syncTracks },
    } = useCueSheet()

    const event = id ? eventsById[id] ?? null : null
    const tracks = id ? tracksByEventId[id] ?? [] : []

    useBreadcrumbOverride(id ?? '', event?.title)

    useEffect(() => {
        if (!id) return
        loadEvent(id)
    }, [id, loadEvent])

    if (!event) {
        return (
            <section className="flex justify-center py-16 mx-auto max-w-content-sm">
                <Spinner size="lg" />
            </section>
        )
    }

    function handleAddTrack() {
        if (!id) return
        const newTrack = {
            id: crypto.randomUUID(),
            name: `Track ${tracks.length + 1}`,
            cues: [],
        }
        syncTracks(id, [...tracks, newTrack])
    }

    function handleDeleteTrack(trackId: string) {
        if (!id) return
        syncTracks(id, tracks.filter((t) => t.id !== trackId))
    }

    return (
        <section className="mx-auto max-w-content">
            {/* Meta header */}
            <Header.Root className="px-4 pt-12">
                <Header.Lead className="gap-2">
                    <Title.h5>{event.title}</Title.h5>
                </Header.Lead>
            </Header.Root>

            <div className="px-4 pt-2 flex items-center gap-3 flex-wrap">
                <Badge label={formatDuration(event.duration)} icon={<Clock />} variant="outline" />
                <Badge label={`${tracks.length} track${tracks.length !== 1 ? 's' : ''}`} icon={<Layers />} color="blue" />
            </div>

            {event.description && (
                <div className="px-4 pt-3">
                    <Paragraph.sm className="text-tertiary">{event.description}</Paragraph.sm>
                </div>
            )}

            <Divider className="px-4 my-6" />

            {/* Timeline section */}
            <div className="px-4 pb-8">
                <Label.md className="block pb-4">Timeline</Label.md>
                <EventTimeline
                    tracks={tracks}
                    totalMin={event.duration}
                    onAddTrack={handleAddTrack}
                    onDeleteTrack={handleDeleteTrack}
                />
            </div>
        </section>
    )
}
