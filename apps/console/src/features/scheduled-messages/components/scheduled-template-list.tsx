import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { Button } from '@moc/ui/components/controls/button'
import { ListItemCard } from '@moc/ui/components/display/list-item-card'
import { DividedList } from '@moc/ui/components/display/divided-list'
import { Decision } from '@moc/ui/components/display/decision'
import { EmptyState } from '@moc/ui/components/feedback/empty-state'
import { LoadingSpinner } from '@moc/ui/components/feedback/spinner'
import { routes } from '@/screens/console-routes'
import { useScheduledMessagesContext } from '../scheduled-messages-context'

export function ScheduledTemplateList() {
    const { state, actions, meta } = useScheduledMessagesContext()
    function renderTemplate(template: (typeof meta.templateRows)[number]) {
        return <ListItemCard.Root key={template.id} className="flex-wrap">
            <ListItemCard.Content className="w-full flex-none sm:w-auto sm:flex-1"><ListItemCard.Title className="whitespace-normal">{template.name}</ListItemCard.Title><ListItemCard.Subtitle>{template.label}</ListItemCard.Subtitle></ListItemCard.Content>
            <ListItemCard.Trailing className="ml-auto flex-wrap"><Button.Link variant="ghost" render={<Link to={template.editPath} />}>Edit</Button.Link><Button.Link variant="secondary" render={<Link to={template.usePath} />}>Use template</Button.Link><Button variant="danger-secondary" data-template-id={template.id} onClick={actions.requestTemplateDelete} disabled={state.busy}>Delete</Button></ListItemCard.Trailing>
        </ListItemCard.Root>
    }
    return <Decision value={meta.templateRows} loading={state.loading}>
        <Decision.Loading><LoadingSpinner className="py-16" /></Decision.Loading>
        <Decision.Empty><EmptyState icon={<FileText />} title="No templates yet" description="Create a reusable announcement or pre-attendance message with editable variables." action={<Button.Link render={<Link to={`/${routes.scheduledTemplateNew}`} />}>Create a template</Button.Link>} /></Decision.Empty>
        <Decision.Data><DividedList>{meta.templateRows.map(renderTemplate)}</DividedList></Decision.Data>
    </Decision>
}
