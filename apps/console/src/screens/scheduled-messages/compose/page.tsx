import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Label, Paragraph } from '@moc/ui/components/display/text'
import { Button } from '@moc/ui/components/controls/button'
import { SplitPanel } from '@moc/ui/components/layout/split-panel'
import { ScheduledMessages } from '@/features/scheduled-messages/scheduled-messages'
import { useScheduledMessagesContext } from '@/features/scheduled-messages/scheduled-messages-context'
import { routes } from '../../console-routes'
import { useScheduledMessageCompose } from './use-scheduled-message-compose'

export function ScheduledMessageComposeScreen() {
    useScheduledMessageCompose()
    const { state, actions, meta } = useScheduledMessagesContext()
    const [pickerOpen, setPickerOpen] = useState(false)

    function openPicker(): void {
        setPickerOpen(true)
    }

    return <>
        <SplitPanel.Header className="h-auto items-start py-3">
            <SplitPanel.Close aria-label="Close message composer" />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1">
                <Label.md>Schedule a message</Label.md>
                {meta.templateRows.length ? <Paragraph.xs className="flex flex-wrap items-center gap-x-1.5 text-tertiary">
                    {meta.templateName ? <>Based on “{meta.templateName}”</> : <>Started from scratch</>}
                    <Button variant="link" onClick={openPicker}>Change</Button>
                </Paragraph.xs> : null}
            </div>
        </SplitPanel.Header>
        <SplitPanel.Content className="@container">
            <ScheduledMessages.Schedules />
        </SplitPanel.Content>
        <SplitPanel.Footer>
            <Button.Link variant="secondary" render={<Link to={`/${routes.scheduledMessages}`} />}>Cancel</Button.Link>
            <Button disabled={state.busy || !state.schedule.groupChatId || !state.schedule.fields.title?.trim()} onClick={actions.requestSchedule}>Review schedule</Button>
        </SplitPanel.Footer>
        <ScheduledMessages.TemplatePicker open={pickerOpen} onOpenChange={setPickerOpen} />
    </>
}
