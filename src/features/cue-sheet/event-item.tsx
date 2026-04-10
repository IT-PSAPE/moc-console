import { Label, Paragraph } from '@/components/display/text'
import { Badge } from '@/components/display/badge'
import { cn } from '@/utils/cn'
import { cv } from '@/utils/cv'
import type { CueSheetEvent } from '@/types/cue-sheet'
import { CalendarClock, Clock, Layers } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useCueSheet } from './cue-sheet-provider'

const itemVariants = cv({
    base: [
        'w-full flex justify-between px-4 py-3 gap-4 bg-background-primary rounded-lg shadow-[0px_1px_2px_0px_rgba(10,13,18,0.05)] outline outline-1 outline-offset-[-1px] outline-border-secondary *:flex-1',
        'items-center *:odd:flex-1 *:odd:max-w-xl *:even:justify-end max-mobile:flex-col *:max-mobile:odd:max-none *:max-mobile:even:justify-start *:max-mobile:w-full',
    ],
})

function formatDuration(minutes: number) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h === 0) return `${m}min`
    if (m === 0) return `${h}h`
    return `${h}h ${m}min`
}

function formatScheduledAt(scheduledAt?: string) {
    if (!scheduledAt) return null
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(scheduledAt))
}

export function EventItem({ event }: { event: CueSheetEvent }) {
    const navigate = useNavigate()
    const { state: { tracksByEventId } } = useCueSheet()
    const trackCount = tracksByEventId[event.id]?.length ?? 0
    const scheduledAt = formatScheduledAt(event.scheduledAt)

    return (
        <div
            className={cn(itemVariants(), 'cursor-pointer hover:bg-background-primary-hover transition-colors')}
            onClick={() => navigate(`/cue-sheet/events/${event.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/cue-sheet/events/${event.id}`) }}
        >
            <div>
                <Label.sm>{event.title}</Label.sm>
                <Paragraph.sm className="text-tertiary">{event.description}</Paragraph.sm>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                {scheduledAt && <Badge label={scheduledAt} icon={<CalendarClock />} color="purple" />}
                <Badge label={formatDuration(event.duration)} icon={<Clock />} variant="outline" />
                {trackCount > 0 && (
                    <Badge label={`${trackCount} track${trackCount !== 1 ? 's' : ''}`} icon={<Layers />} color="blue" />
                )}
            </div>
        </div>
    )
}
