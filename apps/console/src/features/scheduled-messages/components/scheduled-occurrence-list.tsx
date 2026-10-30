import { Activity, EllipsisVertical, RotateCcw, Send, Trash2 } from 'lucide-react'
import { Button } from '@moc/ui/components/controls/button'
import { ListItemCard } from '@moc/ui/components/display/list-item-card'
import { DividedList } from '@moc/ui/components/display/divided-list'
import { Decision } from '@moc/ui/components/display/decision'
import { Badge } from '@moc/ui/components/display/badge'
import { RetryNotification } from '@moc/ui/components/feedback/retry-notification'
import { LoadingSpinner } from '@moc/ui/components/feedback/spinner'
import { EmptyState } from '@moc/ui/components/feedback/empty-state'
import { Dropdown } from '@moc/ui/components/overlays/dropdown'
import type { ScheduledOccurrence } from '@moc/notifications'
import { routes } from '@/screens/console-routes'
import { Link } from 'react-router-dom'
import { useScheduledMessagesContext } from '../scheduled-messages-context'

const occurrenceStatus: Record<ScheduledOccurrence['state'], { label: string; color: 'blue' | 'yellow' | 'green' | 'gray' }> = {
    scheduled: { label: 'Scheduled', color: 'blue' },
    sending: { label: 'Sending', color: 'yellow' },
    sent: { label: 'Sent', color: 'green' },
    cancelled: { label: 'Cancelled', color: 'gray' },
    unknown: { label: 'Delivery unknown', color: 'gray' },
}

export function ScheduledOccurrenceList() {
    const { state, actions, meta } = useScheduledMessagesContext()

    function renderOccurrence(occurrence: (typeof meta.occurrences)[number]) {
        const status = occurrenceStatus[occurrence.state]
        const statusLabel = occurrence.legacy_closed ? `${status.label} · legacy closed` : status.label
        const typeLabel = occurrence.post_role === 'follow_up' ? 'Attendance follow-up' : occurrence.message_type === 'attendance' ? 'Attendance' : 'Announcement'

        function openMessage() {
            if (occurrence.canManage) actions.selectOccurrence(occurrence.id)
            else actions.viewHistory(occurrence.id)
        }
        function openActivity() { actions.viewHistory(occurrence.id) }
        function sendMessage() { actions.requestSend(occurrence.id) }
        function resendMessage() { actions.requestResend(occurrence.id) }
        function deleteMessage() { actions.requestDelete(occurrence.id) }

        return <ListItemCard.Root key={occurrence.id} className="flex-wrap">
            <ListItemCard.Content className="w-auto flex-1 portrait:w-full portrait:flex-none">
                <Button.Unstyled aria-label={`${occurrence.canManage ? 'Manage' : 'View'} ${occurrence.label}`} onClick={openMessage} className="flex w-full min-w-0 flex-col items-start justify-center gap-0.5 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-brand">
                    <ListItemCard.Title className="max-w-full whitespace-normal text-left">{occurrence.label}</ListItemCard.Title>
                    <ListItemCard.Subtitle className="max-w-full whitespace-normal text-left">{typeLabel} · {occurrence.summary}</ListItemCard.Subtitle>
                </Button.Unstyled>
            </ListItemCard.Content>
            <ListItemCard.Trailing className="ml-auto gap-2">
                <Badge dot label={statusLabel} color={status.color} />
                <Dropdown placement="bottom-end">
                    <Dropdown.Trigger><Button.Icon aria-label={`More actions for ${occurrence.label}`} variant="ghost" size="sm" icon={<EllipsisVertical />} disabled={state.busy} /></Dropdown.Trigger>
                    <Dropdown.Panel>
                        <Dropdown.Item onSelect={openActivity}><Activity className="size-4" aria-hidden="true" />Activity</Dropdown.Item>
                        {occurrence.canSend ? <Dropdown.Item onSelect={sendMessage}><Send className="size-4" aria-hidden="true" />Send now</Dropdown.Item> : null}
                        {occurrence.canResend ? <Dropdown.Item onSelect={resendMessage}><RotateCcw className="size-4" aria-hidden="true" />Resend</Dropdown.Item> : null}
                        <Dropdown.Separator />
                        <Dropdown.Item onSelect={deleteMessage} disabled={state.busy || !occurrence.canDelete}><Trash2 className="size-4 text-error" aria-hidden="true" /><span className="text-error">Delete</span></Dropdown.Item>
                    </Dropdown.Panel>
                </Dropdown>
            </ListItemCard.Trailing>
        </ListItemCard.Root>
    }

    if (meta.occurrenceLoading) return <LoadingSpinner />
    const isHistory = state.tab === 'history'
    const title = isHistory ? 'No message history' : 'No upcoming messages'
    const description = isHistory ? 'Sent, cancelled and delivery-unknown messages appear here.' : 'Messages waiting to be sent appear here.'
    return <Decision value={meta.occurrences}>
        <Decision.Empty><EmptyState icon={<Activity />} title={title} description={description} action={isHistory ? undefined : <Button.Link render={<Link to={`/${routes.scheduledMessageNew}`} />}>New message</Button.Link>} /></Decision.Empty>
        <Decision.Data>
            <DividedList>{meta.occurrences.map(renderOccurrence)}</DividedList>
            {state.historyPageError ? <RetryNotification title="Could not load older messages" description={state.historyPageError} onRetry={actions.loadMoreHistory} isRetrying={state.historyLoadingMore} /> : null}
            {meta.hasMoreHistory ? <Button variant="secondary" onClick={actions.loadMoreHistory} disabled={state.historyLoadingMore}>{state.historyLoadingMore ? 'Loading…' : 'Load more'}</Button> : null}
        </Decision.Data>
    </Decision>
}
