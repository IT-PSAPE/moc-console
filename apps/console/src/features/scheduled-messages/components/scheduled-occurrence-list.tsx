import { Link } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import { Button } from '@moc/ui/components/controls/button'
import { ListItemCard } from '@moc/ui/components/display/list-item-card'
import { DividedList } from '@moc/ui/components/display/divided-list'
import { Decision } from '@moc/ui/components/display/decision'
import { Badge } from '@moc/ui/components/display/badge'
import { Alert } from '@moc/ui/components/feedback/alert'
import { LoadingSpinner } from '@moc/ui/components/feedback/spinner'
import { EmptyState } from '@moc/ui/components/feedback/empty-state'
import type { ScheduledOccurrence } from '@moc/notifications'
import { routes } from '@/screens/console-routes'
import { useScheduledMessagesContext } from '../scheduled-messages-context'

const occurrenceStatus: Record<ScheduledOccurrence['state'], { label: string; color: 'blue' | 'yellow' | 'green' | 'gray' }> = {
    scheduled: { label: 'Scheduled', color: 'blue' },
    sending: { label: 'Sending', color: 'yellow' },
    sent: { label: 'Sent', color: 'green' },
    cancelled: { label: 'Cancelled', color: 'gray' },
    unknown: { label: 'Unknown', color: 'gray' },
}

export function ScheduledOccurrenceList() {
    const { state, actions, meta } = useScheduledMessagesContext()
    function select(event: React.MouseEvent<HTMLButtonElement>): void { actions.selectOccurrence(event.currentTarget.value) }
    function history(event: React.MouseEvent<HTMLButtonElement>): void { actions.viewHistory(event.currentTarget.value) }
    function send(event: React.MouseEvent<HTMLButtonElement>): void { actions.requestSend(event.currentTarget.value) }
    function remove(event: React.MouseEvent<HTMLButtonElement>): void { actions.requestDelete(event.currentTarget.value) }
    function renderOccurrence(o: ScheduledOccurrence & { summary: string; canManage: boolean; canDelete: boolean }) {
        const status = occurrenceStatus[o.state]
        return <ListItemCard.Root key={o.id} className="flex-wrap">
            <ListItemCard.Content className="w-auto flex-1 portrait:w-full portrait:flex-none"><ListItemCard.Title className="whitespace-normal">{o.fields.title}</ListItemCard.Title><ListItemCard.Subtitle className="whitespace-normal">{o.summary}</ListItemCard.Subtitle></ListItemCard.Content>
            <ListItemCard.Trailing className="ml-auto">
                <Badge dot label={status.label} color={status.color} />
                <Button size="sm" variant="secondary" value={o.id} onClick={history}>History</Button>
                {o.canManage ? <Button size="sm" variant="secondary" value={o.id} onClick={select} disabled={state.busy}>Manage</Button> : null}
                {o.canManage ? <Button size="sm" value={o.id} onClick={send} disabled={state.busy}>{o.state === 'sent' ? 'Resend' : 'Send now'}</Button> : null}
                <Button size="sm" variant="danger" value={o.id} onClick={remove} disabled={state.busy || !o.canDelete}>Delete</Button>
            </ListItemCard.Trailing>
        </ListItemCard.Root>
    }
    if (meta.occurrenceLoading) return <LoadingSpinner />
    return <Decision value={meta.occurrences}>
        <Decision.Empty><EmptyState icon={<MessageSquare />} title={meta.occurrenceEmptyTitle} description={meta.occurrenceEmptyDescription} action={<Button.Link render={<Link to={`/${routes.scheduledMessageNew}`} />}>Schedule a message</Button.Link>} /></Decision.Empty>
        <Decision.Data>
            <DividedList>{meta.occurrences.map(renderOccurrence)}</DividedList>
            {state.historyPageError ? <Alert variant="error" title="Could not load older messages" description={state.historyPageError} /> : null}
            {meta.hasMoreHistory ? <Button variant="secondary" onClick={actions.loadMoreHistory} disabled={state.historyLoadingMore}>{state.historyLoadingMore ? 'Loading…' : 'Load more'}</Button> : null}
        </Decision.Data>
    </Decision>
}
