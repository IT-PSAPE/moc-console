import { Calendar } from 'lucide-react'
import { ListItemCard } from '@moc/ui/components/display/list-item-card'
import type { Checklist } from '@moc/types/checklists'
import { formatUtcIsoInBrowserTimeZone } from '@moc/utils/browser-date-time'

export function ChecklistItemContent({ checklist }: { checklist: Checklist }) {
    return (
        <ListItemCard.Root>
            <ListItemCard.Content>
                <ListItemCard.Title>{checklist.name}</ListItemCard.Title>
                {checklist.description && <ListItemCard.Subtitle>{checklist.description}</ListItemCard.Subtitle>}
            </ListItemCard.Content>
            {checklist.scheduledAt ? (
                <ListItemCard.Trailing>
                    <ListItemCard.Meta>
                        <ListItemCard.MetaItem icon={<Calendar />}>{formatUtcIsoInBrowserTimeZone(checklist.scheduledAt, { dateStyle: 'medium' })}</ListItemCard.MetaItem>
                    </ListItemCard.Meta>
                </ListItemCard.Trailing>
            ) : null}
        </ListItemCard.Root>
    )
}
