import { Link } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import { Button } from '@moc/ui/components/controls/button'
import { ListItemCard } from '@moc/ui/components/display/list-item-card'
import { DividedList } from '@moc/ui/components/display/divided-list'
import { Decision } from '@moc/ui/components/display/decision'
import { EmptyState } from '@moc/ui/components/feedback/empty-state'
import type { ScheduledOccurrence } from '@moc/notifications'
import { routes } from '@/screens/console-routes'
import { useScheduledMessagesContext } from '../scheduled-messages-context'

export function ScheduledOccurrenceList() {
    const { state, actions, meta } = useScheduledMessagesContext()
    function select(event: React.MouseEvent<HTMLButtonElement>): void { actions.selectOccurrence(event.currentTarget.value) }
    function send(event: React.MouseEvent<HTMLButtonElement>): void { actions.requestSend(event.currentTarget.value) }
    function remove(event: React.MouseEvent<HTMLButtonElement>): void { actions.requestDelete(event.currentTarget.value) }
    function renderOccurrence(o: ScheduledOccurrence & { summary: string }) {
        return <ListItemCard.Root key={o.id} className="flex-wrap">
            <ListItemCard.Content className="w-auto flex-1 portrait:w-full portrait:flex-none"><ListItemCard.Title className="whitespace-normal">{o.fields.title}</ListItemCard.Title><ListItemCard.Subtitle className="whitespace-normal">{o.summary}</ListItemCard.Subtitle></ListItemCard.Content>
            <ListItemCard.Trailing className="ml-auto">
                <Button variant="secondary" value={o.id} onClick={select} disabled={state.busy || !['scheduled', 'sent'].includes(o.state)}>Manage</Button>
                {['scheduled', 'sent'].includes(o.state) ? <Button value={o.id} onClick={send} disabled={state.busy}>{o.state === 'sent' ? 'Resend' : 'Send now'}</Button> : null}
                <Button variant="danger" value={o.id} onClick={remove} disabled={state.busy || o.state === 'sending'}>Delete</Button>
            </ListItemCard.Trailing>
        </ListItemCard.Root>
    }
    return <Decision value={meta.occurrences}>
        <Decision.Empty><EmptyState icon={<MessageSquare />} title="No active messages" description="Schedule a message once or on a recurring basis. Sent messages stay here until they expire." action={<Button.Link render={<Link to={`/${routes.scheduledMessageNew}`} />}>Schedule a message</Button.Link>} /></Decision.Empty>
        <Decision.Data><DividedList>{meta.occurrences.map(renderOccurrence)}</DividedList></Decision.Data>
    </Decision>
}
