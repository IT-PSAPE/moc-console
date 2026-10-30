import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Button } from '@moc/ui/components/controls/button'
import { Label, Paragraph } from '@moc/ui/components/display/text'
import { FeedbackProvider, useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { Notification } from '@moc/ui/components/feedback/notification'
import { RetryNotification } from '@moc/ui/components/feedback/retry-notification'
import { ConfirmationDialog } from '@moc/ui/components/overlays/confirmation-dialog'
import { OverlayProvider } from '@moc/ui/components/overlays/overlay-provider'
import '@moc/ui/styles.css'

function FeedbackFixture() {
    const { toast, notify } = useFeedback()
    const [source, setSource] = useState(true)
    const [retrying, setRetrying] = useState(false)
    const [retryCount, setRetryCount] = useState(0)
    const [renderCount, setRenderCount] = useState(0)
    const [dialog, setDialog] = useState(false)
    const [dialogError, setDialogError] = useState('')
    const [description, setDescription] = useState('Retry this source without losing other notices.')

    function rerender(): void { setRenderCount(current => current + 1) }
    function toggleSource(): void { setSource(current => !current) }
    function retry(): void { setRetryCount(current => current + 1); setRetrying(true) }
    function finishRetry(): void { setRetrying(false) }
    function showSuccess(): void { toast({ title: 'Saved successfully', variant: 'success', duration: 600 }) }
    function showError(): void { toast({ title: 'Action failed', variant: 'error' }) }
    function showMany(): void {
        for (let index = 1; index <= 6; index += 1) {
            toast({ title: `Independent error ${index}`, description: 'Each error can be dismissed separately.', variant: 'error' })
        }
    }
    function showLong(): void { notify({ title: 'Long error', description: 'https://example.com/'.repeat(30), variant: 'error' }) }
    function openDialog(): void { setDialog(true) }
    function confirm(): void { setDialogError('Please retry the operation.') }
    function changeDescription(): void { setDescription('The source reported a different message.') }
    function enterFullscreen(): void { void document.getElementById('feedback-surface')?.requestFullscreen() }

    return (
        <main id="feedback-surface" className="flex min-h-svh flex-col items-start gap-3 bg-primary p-6 text-primary">
            <Label.lg>Notification verification</Label.lg>
            <Paragraph.sm>Render {renderCount} · Retries {retryCount}</Paragraph.sm>
            <div className="grid w-full max-w-sm grid-cols-2 gap-2">
            <Button onClick={rerender}>Rerender source</Button>
            <Button onClick={toggleSource}>Toggle source</Button>
            <Button onClick={finishRetry}>Finish retry</Button>
            <Button onClick={changeDescription}>Change notification message</Button>
            <Button onClick={showMany}>Show six errors</Button>
            <Button onClick={showSuccess}>Show success</Button>
            <Button onClick={showError}>Show action error</Button>
            <Button onClick={showLong}>Show long error</Button>
            <Button onClick={openDialog}>Open dialog</Button>
            <Button onClick={enterFullscreen}>Enter fullscreen</Button>
            </div>
            {source ? <RetryNotification title="Initial load failed" description={description} onRetry={retry} isRetrying={retrying} /> : null}
            <ConfirmationDialog open={dialog} onOpenChange={setDialog} title="Confirm operation" description="Verify toast interaction while this dialog is open." confirmLabel="Confirm" onConfirm={confirm} errorText={dialogError} />
            <Notification title="Persistent information" description="This message is intentionally persistent." duration={0} />
        </main>
    )
}

createRoot(document.getElementById('root')!).render(
    <StrictMode><OverlayProvider><FeedbackProvider><FeedbackFixture /></FeedbackProvider></OverlayProvider></StrictMode>,
)
