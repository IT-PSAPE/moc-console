import { Link } from 'react-router-dom'
import { Label } from '@moc/ui/components/display/text'
import { Button } from '@moc/ui/components/controls/button'
import { SplitPanel } from '@moc/ui/components/layout/split-panel'
import { ScheduledMessages } from '@/features/scheduled-messages/scheduled-messages'
import { useScheduledMessagesContext } from '@/features/scheduled-messages/scheduled-messages-context'
import { routes } from '../../console-routes'

export function ScheduledMessageComposeScreen() {
    const { state, actions } = useScheduledMessagesContext()
    const sendNow = state.draft.sendMode === 'now'
    return <>
        <SplitPanel.Header className="h-auto items-start py-3">
            <SplitPanel.Close aria-label="Close message composer" />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1"><Label.md>New message</Label.md></div>
        </SplitPanel.Header>
        <SplitPanel.Content className="@container">
            <ScheduledMessages.Composer />
        </SplitPanel.Content>
        <SplitPanel.Footer>
            <Button.Link variant="secondary" render={<Link to={`/${routes.scheduledMessages}`} />}>Cancel</Button.Link>
            <Button disabled={state.isInitialLoading || state.busy || !state.draft.groupChatId} onClick={actions.requestCreate}>{sendNow ? 'Review send' : 'Review schedule'}</Button>
        </SplitPanel.Footer>
    </>
}
