import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileText, ListRestart, MessageSquare, Plus, RefreshCw } from 'lucide-react'
import { Page } from '@moc/ui/components/layout/page'
import { CollectionToolbar } from '@moc/ui/components/layout/collection-toolbar'
import { SegmentedControl } from '@moc/ui/components/controls/segmented-control'
import { Button } from '@moc/ui/components/controls/button'
import { Alert } from '@moc/ui/components/feedback/alert'
import { ScheduledMessages } from '@/features/scheduled-messages/scheduled-messages'
import { useScheduledMessagesContext } from '@/features/scheduled-messages/scheduled-messages-context'
import { routes } from '../console-routes'

export function ScheduledMessagesScreen() {
    const { state, actions, meta } = useScheduledMessagesContext()
    const navigate = useNavigate()
    const [pickerOpen, setPickerOpen] = useState(false)

    // With no templates there is nothing to pick from, so go straight to compose.
    function startNewMessage(): void {
        if (meta.templateRows.length) setPickerOpen(true)
        else navigate(`/${routes.scheduledMessageNew}`)
    }

    if (state.isInitialLoading) return <Page.Loading />
    return <Page>
        <Page.Header>
            <Page.Heading><Page.Title>Messages</Page.Title></Page.Heading>
            <Page.Controls>
                {state.tab === 'templates' ? <Button.Link variant="secondary" render={<Link to={`/${routes.scheduledTemplateNew}`} />}>Create template</Button.Link> : null}
                <Button icon={<Plus />} onClick={startNewMessage}>New message</Button>
                <Button.Icon variant="secondary" aria-label="Sync Telegram commands" title="Update the commands shown in Telegram" icon={<ListRestart />} onClick={actions.syncCommands} disabled={state.busy || state.loading} />
                <Button.Icon variant="secondary" aria-label="Refresh messages" title="Refresh messages" icon={<RefreshCw />} onClick={actions.reload} disabled={state.loading || state.busy} />
            </Page.Controls>
        </Page.Header>
        <CollectionToolbar>
            <CollectionToolbar.Views>
                <SegmentedControl value={state.tab} onValueChange={actions.setTab}>
                    <SegmentedControl.Item value="active" icon={<MessageSquare />} className="whitespace-nowrap">Active messages</SegmentedControl.Item>
                    <SegmentedControl.Item value="templates" icon={<FileText />} className="whitespace-nowrap">Templates</SegmentedControl.Item>
                </SegmentedControl>
            </CollectionToolbar.Views>
        </CollectionToolbar>
        <Page.Content>{state.loadError ? <Alert variant="error" title="Couldn't load messages" description={state.loadError} action={<Button variant="secondary" onClick={actions.reload}>Retry</Button>} /> : <>
            {state.error ? <Alert variant="error" title="Couldn't complete action" description={state.error} /> : null}
            {state.tab === 'active' ? <ScheduledMessages.Occurrences /> : <ScheduledMessages.Templates />}
        </>}</Page.Content>
        <ScheduledMessages.TemplatePicker open={pickerOpen} onOpenChange={setPickerOpen} />
    </Page>
}
