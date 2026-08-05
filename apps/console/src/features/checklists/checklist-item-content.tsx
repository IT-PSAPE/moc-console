import { CalendarClock, CheckCircle2, ListChecks } from 'lucide-react'
import { ListItemCard } from '@moc/ui/components/display/list-item-card'
import type { Checklist } from '@moc/types/checklists'
import { formatUtcIsoInBrowserTimeZone } from '@moc/utils/browser-date-time'
import { getChecklistCounts } from './checklist-content'

function formatScheduledAt(scheduledAt?: string) {
    if (!scheduledAt) return null
    return formatUtcIsoInBrowserTimeZone(scheduledAt, { dateStyle: 'medium', timeStyle: 'short' })
}

export function ChecklistItemContent({ checklist }: { checklist: Checklist }) {
    const { total, checked } = getChecklistCounts(checklist)
    const allDone = total > 0 && checked === total
    const scheduledAt = formatScheduledAt(checklist.scheduledAt)

    return (
        <ListItemCard.Root>
            <ListItemCard.Content>
                <ListItemCard.Title>{checklist.name}</ListItemCard.Title>
                {checklist.description && <ListItemCard.Subtitle>{checklist.description}</ListItemCard.Subtitle>}
                <ListItemCard.Meta>
                    {scheduledAt && <ListItemCard.MetaItem icon={<CalendarClock />}>{scheduledAt}</ListItemCard.MetaItem>}
                    <ListItemCard.MetaItem className={allDone ? 'text-success' : undefined} icon={<ListChecks />}>{checked} of {total} complete</ListItemCard.MetaItem>
                    {allDone && <ListItemCard.MetaItem className="text-success" icon={<CheckCircle2 />}>Complete</ListItemCard.MetaItem>}
                </ListItemCard.Meta>
            </ListItemCard.Content>
        </ListItemCard.Root>
    )
}
