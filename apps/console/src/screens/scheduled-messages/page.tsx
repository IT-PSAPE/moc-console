import { Link } from 'react-router-dom'
import { History, ListRestart, MessageSquare, Plus, RefreshCw } from 'lucide-react'
import { Page } from '@moc/ui/components/layout/page'
import { CollectionToolbar } from '@moc/ui/components/layout/collection-toolbar'
import { SegmentedControl } from '@moc/ui/components/controls/segmented-control'
import { Button } from '@moc/ui/components/controls/button'
import { Alert } from '@moc/ui/components/feedback/alert'
import { ScheduledMessages } from '@/features/scheduled-messages/scheduled-messages'
import { useScheduledMessagesContext } from '@/features/scheduled-messages/scheduled-messages-context'
import { routes } from '../console-routes'

export function ScheduledMessagesScreen() {
    const { state, actions } = useScheduledMessagesContext()
    if (state.isInitialLoading) return <Page.Loading />
    return <Page>
        <Page.Header>
            <Page.Heading><Page.Title>Messages</Page.Title></Page.Heading>
            <Page.Controls>
                <Button.Link icon={<Plus />} render={<Link to={`/${routes.scheduledMessageNew}`} onClick={actions.startMessage} />}>New message</Button.Link>
                <Button.Icon variant="secondary" aria-label="Sync Telegram commands" title="Update the commands shown in Telegram" icon={<ListRestart />} onClick={actions.syncCommands} disabled={state.busy || state.loading} />
                <Button.Icon variant="secondary" aria-label="Refresh messages" title="Refresh messages" icon={<RefreshCw />} onClick={actions.reload} disabled={state.loading || state.busy} />
            </Page.Controls>
        </Page.Header>
        <CollectionToolbar>
            <CollectionToolbar.Views>
                <SegmentedControl value={state.tab} onValueChange={actions.setTab}>
                    <SegmentedControl.Item value="upcoming" icon={<MessageSquare />} className="whitespace-nowrap">Upcoming</SegmentedControl.Item>
                    <SegmentedControl.Item value="history" icon={<History />} className="whitespace-nowrap">History</SegmentedControl.Item>
                </SegmentedControl>
            </CollectionToolbar.Views>
        </CollectionToolbar>
        <Page.Content>{state.loadError ? <Alert variant="error" title="Couldn't load messages" description={state.loadError} action={<Button variant="secondary" onClick={actions.reload}>Retry</Button>} /> : <>
            {state.error ? <Alert variant="error" title="Couldn't complete action" description={state.error} /> : null}
            <ScheduledMessages.List />
        </>}</Page.Content>
    </Page>
}
