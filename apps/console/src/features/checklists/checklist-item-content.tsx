import { Calendar } from 'lucide-react'
import { ListItemCard } from '@moc/ui/components/display/list-item-card'
import { SegmentedProgress } from '@moc/ui/components/feedback/segmented-progress'
import type { Checklist } from '@moc/types/checklists'
import { formatUtcIsoInBrowserTimeZone } from '@moc/utils/browser-date-time'
import { getChecklistCounts } from './checklist-content'

export function ChecklistItemContent({ checklist }: { checklist: Checklist }) {
    const { total, checked } = getChecklistCounts(checklist)

    return (
        <ListItemCard.Root>
            <ListItemCard.Content>
                <ListItemCard.Title>{checklist.name}</ListItemCard.Title>
                {checklist.description && <ListItemCard.Subtitle>{checklist.description}</ListItemCard.Subtitle>}
            </ListItemCard.Content>
            <ListItemCard.Trailing>
                <SegmentedProgress max={total} value={checked} aria-label={`${checked} of ${total} checklist items complete`} className="w-16 shrink-0" />
                {checklist.scheduledAt && (
                    <ListItemCard.Meta>
                        <ListItemCard.MetaItem icon={<Calendar />}>{formatUtcIsoInBrowserTimeZone(checklist.scheduledAt, { dateStyle: 'medium' })}</ListItemCard.MetaItem>
                    </ListItemCard.Meta>
                )}
            </ListItemCard.Trailing>
        </ListItemCard.Root>
    )
}
