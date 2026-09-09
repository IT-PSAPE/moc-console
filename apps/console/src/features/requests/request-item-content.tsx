import { CalendarFold, CircleAlert, Tag } from 'lucide-react'
import { ListItemCard } from '@moc/ui/components/display/list-item-card'
import type { Request } from '@moc/types/requests'
import { categoryLabel, priorityLabel } from '@moc/types/requests'
import { formatUtcIsoInBrowserTimeZone } from '@moc/utils/browser-date-time'

export function RequestItemContent({ request }: { request: Request }) {
    return (
        <ListItemCard.Root>
            <ListItemCard.Content>
                <ListItemCard.Title>{request.title}</ListItemCard.Title>
                <ListItemCard.Subtitle>{request.what}</ListItemCard.Subtitle>
                <ListItemCard.Meta>
                    <ListItemCard.MetaItem className={request.priority === 'urgent' ? 'text-error' : undefined} icon={<CircleAlert />}>{priorityLabel[request.priority]}</ListItemCard.MetaItem>
                    <ListItemCard.MetaItem icon={<Tag />}>{categoryLabel[request.category]}</ListItemCard.MetaItem>
                    {request.dueDate && (
                        <ListItemCard.MetaItem icon={<CalendarFold />}>
                            {formatUtcIsoInBrowserTimeZone(request.dueDate, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </ListItemCard.MetaItem>
                    )}
                </ListItemCard.Meta>
            </ListItemCard.Content>
        </ListItemCard.Root>
    )
}
