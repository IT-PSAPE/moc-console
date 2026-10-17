import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Badge } from '@moc/ui/components/display/badge'
import { ListItemCard } from '@moc/ui/components/display/list-item-card'
import { InteractiveSurface } from '@moc/ui/components/controls/interactive-surface'
import type { MessageType } from '@moc/notifications'
import { routes } from '@/screens/console-routes'
import { messageTypeMeta } from './meta'

type MessageTemplateRowProps = {
    type: MessageType
    customised: boolean
}

export function MessageTemplateRow({ type, customised }: MessageTemplateRowProps) {
    const meta = messageTypeMeta(type)
    const path = `/${routes.messageTemplateDetail.replace(':messageType', encodeURIComponent(type))}`
    return (
        <InteractiveSurface.CardLink render={<Link to={path} />} aria-label={meta.label}>
            <ListItemCard.Root>
                <ListItemCard.Content>
                    <div className="flex items-center gap-2">
                        <ListItemCard.Title>{meta.label}</ListItemCard.Title>
                        {customised && <Badge label="Customised" color="blue" variant="outline" />}
                    </div>
                    <ListItemCard.Subtitle>{meta.description}</ListItemCard.Subtitle>
                </ListItemCard.Content>
                <ListItemCard.Trailing>
                    <ChevronRight className="size-4 shrink-0 text-quaternary" aria-hidden="true" />
                </ListItemCard.Trailing>
            </ListItemCard.Root>
        </InteractiveSurface.CardLink>
    )
}
