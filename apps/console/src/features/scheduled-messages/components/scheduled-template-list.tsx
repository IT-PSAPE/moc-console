import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { Button } from '@moc/ui/components/controls/button'
import { ListItemCard } from '@moc/ui/components/display/list-item-card'
import { DividedList } from '@moc/ui/components/display/divided-list'
import { Decision } from '@moc/ui/components/display/decision'
import { Badge } from '@moc/ui/components/display/badge'
import type { ScheduledMessageType } from '@moc/notifications'
import { EmptyState } from '@moc/ui/components/feedback/empty-state'
import { routes } from '@/screens/console-routes'
import { useScheduledMessagesContext } from '../scheduled-messages-context'

const messageTypeColor: Record<ScheduledMessageType, 'gray' | 'blue'> = {
    announcement: 'gray',
    pre_attendance: 'blue',
}

export function ScheduledTemplateList() {
    const { state, actions, meta } = useScheduledMessagesContext()
    function renderTemplate(template: (typeof meta.templateRows)[number]) {
        return <ListItemCard.Root key={template.id} className="flex-wrap">
            <ListItemCard.Content className="w-auto flex-1 portrait:w-full portrait:flex-none"><ListItemCard.Title className="whitespace-normal">{template.name}</ListItemCard.Title><ListItemCard.Subtitle className="whitespace-normal">{template.fields.title}</ListItemCard.Subtitle></ListItemCard.Content>
            <ListItemCard.Trailing className="ml-auto flex-wrap">
                <Badge dot label={template.label} color={messageTypeColor[template.message_type]} />
                <Button.Link size="sm" variant="ghost" render={<Link to={template.editPath} />}>Edit</Button.Link>
                <Button.Link size="sm" variant="secondary" render={<Link to={template.usePath} />}>Use template</Button.Link>
                <Button size="sm" variant="danger-secondary" data-template-id={template.id} onClick={actions.requestTemplateDelete} disabled={state.busy}>Delete</Button>
            </ListItemCard.Trailing>
        </ListItemCard.Root>
    }
    return <Decision value={meta.templateRows}>
        <Decision.Empty><EmptyState icon={<FileText />} title="No templates yet" description="Create a reusable announcement or pre-attendance message with editable variables." action={<Button.Link render={<Link to={`/${routes.scheduledTemplateNew}`} />}>Create a template</Button.Link>} /></Decision.Empty>
        <Decision.Data><DividedList>{meta.templateRows.map(renderTemplate)}</DividedList></Decision.Data>
    </Decision>
}
