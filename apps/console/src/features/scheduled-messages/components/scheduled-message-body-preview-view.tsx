import { Alert } from '@moc/ui/components/feedback/alert'
import { Card } from '@moc/ui/components/display/card'
import { useScheduledMessageBodyContext } from './scheduled-message-body-context'
import { ScheduledTelegramPreview } from './scheduled-telegram-preview'

export function ScheduledMessageBodyPreviewView() {
    const { state } = useScheduledMessageBodyContext()
    if (state.view !== 'preview') return null
    return <Card className="rounded-b-lg border-primary bg-[#0e1621] shadow-xs">
        <Card.Content className="border-t-0 bg-[#0e1621] px-4 py-4 tablet:px-3" role="region" aria-label="Telegram preview">
            <div className="mx-auto flex w-full max-w-[28rem] flex-col gap-3">
                {state.primaryPreview.error ? <Alert variant="error" title="Check the message" description={state.primaryPreview.error} /> : <ScheduledTelegramPreview preview={state.primaryPreview} />}
                {state.followUpPreview ? state.followUpPreview.error
                    ? <Alert variant="error" title="Check the Attendance follow-up" description={state.followUpPreview.error} />
                    : <ScheduledTelegramPreview preview={state.followUpPreview} /> : null}
            </div>
        </Card.Content>
    </Card>
}
