import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Badge } from '@moc/ui/components/display/badge'
import { Label, Paragraph } from '@moc/ui/components/display/text'
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
        <InteractiveSurface.Link render={<Link to={path} />} className="flex w-full items-center justify-between gap-3 border-b border-tertiary px-3 py-3 text-left last:border-b-0 hover:bg-secondary">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-2">
                    <Label.sm>{meta.label}</Label.sm>
                    {customised && <Badge label="Customised" color="blue" variant="outline" />}
                </div>
                <Paragraph.xs className="text-quaternary">{meta.description}</Paragraph.xs>
            </div>
            <ChevronRight className="size-4 shrink-0 text-quaternary" aria-hidden="true" />
        </InteractiveSurface.Link>
    )
}
