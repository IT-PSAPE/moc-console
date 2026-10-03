import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Page } from '@moc/ui/components/layout/page'
import { Button } from '@moc/ui/components/controls/button'
import { ScheduledMessages } from '@/features/scheduled-messages/scheduled-messages'
import { routes } from '../../console-routes'
import { useScheduledMessageCompose } from './use-scheduled-message-compose'
export function ScheduledMessageComposeScreen() {
    useScheduledMessageCompose()
    return <Page>
        <Page.Header className="max-w-content-md"><Page.Heading><Button.Link variant="ghost" className="-ml-3 w-fit" icon={<ArrowLeft />} render={<Link to={`/${routes.scheduledMessages}`} />}>Scheduled messages</Button.Link><Page.Title>Schedule a message</Page.Title><Page.Description>Choose a template, fill in its variables, then set the destination and schedule.</Page.Description></Page.Heading></Page.Header>
        <Page.Content width="standard" className="flex flex-col gap-6"><ScheduledMessages.Schedules /></Page.Content>
    </Page>
}
