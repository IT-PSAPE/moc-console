import { Link } from 'react-router-dom'
import { FileText, PenLine } from 'lucide-react'
import type { ScheduledMessageType } from '@moc/notifications'
import { Modal } from '@moc/ui/components/overlays/modal'
import { Button } from '@moc/ui/components/controls/button'
import { InteractiveSurface } from '@moc/ui/components/controls/interactive-surface'
import { Badge } from '@moc/ui/components/display/badge'
import { DividedList } from '@moc/ui/components/display/divided-list'
import { ListItemCard } from '@moc/ui/components/display/list-item-card'
import { Label, Paragraph } from '@moc/ui/components/display/text'
import { routes } from '@/screens/console-routes'
import { useScheduledMessagesContext } from '../scheduled-messages-context'

const messageTypeColor: Record<ScheduledMessageType, 'gray' | 'blue'> = {
    announcement: 'gray',
    pre_attendance: 'blue',
}

type ScheduledTemplatePickerProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
}

/**
 * The first step of "New message": pick a template or start from scratch.
 * Every option is a link into the compose screen, so the picker owns no state
 * beyond its open flag.
 */
export function ScheduledTemplatePicker({ open, onOpenChange }: ScheduledTemplatePickerProps) {
    const { meta } = useScheduledMessagesContext()

    function close(): void {
        onOpenChange(false)
    }

    function renderTemplate(template: (typeof meta.templateRows)[number]) {
        return <InteractiveSurface.CardLink key={template.id} render={<Link to={template.usePath} onClick={close} />} aria-label={`Use template ${template.name}`}>
            <ListItemCard.Root>
                <ListItemCard.Leading><FileText /></ListItemCard.Leading>
                <ListItemCard.Content>
                    <div className="flex min-w-0 items-center gap-2">
                        <ListItemCard.Title className="min-w-0">{template.name}</ListItemCard.Title>
                        <Badge dot label={template.label} color={messageTypeColor[template.message_type]} />
                    </div>
                    {template.fields.title ? <ListItemCard.Subtitle>{template.fields.title}</ListItemCard.Subtitle> : null}
                </ListItemCard.Content>
            </ListItemCard.Root>
        </InteractiveSurface.CardLink>
    }

    return <Modal open={open} onOpenChange={onOpenChange}>
        <Modal.Portal>
            <Modal.Backdrop />
            <Modal.Positioner>
                <Modal.Panel className="max-w-lg">
                    <Modal.Header>
                        <div className="flex min-w-0 flex-1 flex-col">
                            <Label.md>New message</Label.md>
                            <Paragraph.xs className="text-tertiary">Start from one of your templates or from scratch.</Paragraph.xs>
                        </div>
                    </Modal.Header>
                    <Modal.Content>
                        <DividedList>
                            {meta.templateRows.map(renderTemplate)}
                            <InteractiveSurface.CardLink render={<Link to={`/${routes.scheduledMessageNew}`} onClick={close} />}>
                                <ListItemCard.Root>
                                    <ListItemCard.Leading className="bg-brand text-brand"><PenLine /></ListItemCard.Leading>
                                    <ListItemCard.Content>
                                        <ListItemCard.Title>Start from scratch</ListItemCard.Title>
                                        <ListItemCard.Subtitle>Write a new announcement or pre-attendance message.</ListItemCard.Subtitle>
                                    </ListItemCard.Content>
                                </ListItemCard.Root>
                            </InteractiveSurface.CardLink>
                        </DividedList>
                    </Modal.Content>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={close}>Cancel</Button>
                    </Modal.Footer>
                </Modal.Panel>
            </Modal.Positioner>
        </Modal.Portal>
    </Modal>
}
