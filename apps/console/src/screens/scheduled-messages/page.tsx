import { Link } from 'react-router-dom'
import { Plus, RefreshCw } from 'lucide-react'
import { Page } from '@moc/ui/components/layout/page'
import { Tabs } from '@moc/ui/components/layout/tabs'
import { Button } from '@moc/ui/components/controls/button'
import { Alert } from '@moc/ui/components/feedback/alert'
import { ScheduledMessages } from '@/features/scheduled-messages/scheduled-messages'
import { useScheduledMessagesContext } from '@/features/scheduled-messages/scheduled-messages-context'
import { routes } from '../console-routes'

export function ScheduledMessagesScreen() {
    const { state, actions } = useScheduledMessagesContext()
    return <Page>
        <Page.Header><Page.Heading><Page.Title>Scheduled messages</Page.Title></Page.Heading><Page.Actions><Button.Link icon={<Plus />} render={<Link to={`/${routes.scheduledMessageNew}`} />}>New message</Button.Link></Page.Actions></Page.Header>
        <Tabs value={state.tab} onValueChange={actions.setTab} variant="pill">
            <Page.Toolbar className="justify-between">
                <Tabs.List><Tabs.Tab value="active">Active messages</Tabs.Tab><Tabs.Tab value="templates">Templates</Tabs.Tab></Tabs.List>
                <div className="flex flex-wrap items-center gap-2">
                    {state.tab === 'templates' ? <Button.Link variant="secondary" render={<Link to={`/${routes.scheduledTemplateNew}`} />}>Create template</Button.Link> : null}
                    <Button variant="ghost" onClick={actions.syncCommands} disabled={state.busy || state.loading}>Sync Telegram commands</Button>
                    <Button.Icon variant="ghost" aria-label="Refresh messages" icon={<RefreshCw />} onClick={actions.reload} disabled={state.loading || state.busy} />
                </div>
            </Page.Toolbar>
            <Page.Content>{state.loadError ? <Alert variant="error" title="Couldn't load scheduled messages" description={state.loadError} action={<Button variant="secondary" onClick={actions.reload}>Retry</Button>} /> : <>
                {state.error ? <Alert variant="error" title="Couldn't complete action" description={state.error} /> : null}
                <Tabs.Panel value="active"><ScheduledMessages.Occurrences /></Tabs.Panel>
                <Tabs.Panel value="templates"><ScheduledMessages.Templates /></Tabs.Panel>
            </>}</Page.Content>
        </Tabs>
    </Page>
}
