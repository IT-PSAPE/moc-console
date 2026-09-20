import { Navigate } from 'react-router-dom'
import { PublicLayout } from '@/features/components/public-layout'
import { routes } from '@/screens/console-routes'
import { Label, Paragraph, Title } from '@moc/ui/components/display/text'
import { Button } from '@moc/ui/components/controls/button'
import { Check, Copy, Share2 } from 'lucide-react'
import { useConfirmation } from './use-confirmation'
import { PublicFlow } from '@/features/components/public-flow'
import { Alert } from '@moc/ui/components/feedback/alert'

export function ConfirmationScreen() {
  const { state, actions, meta } = useConfirmation()
  const confirmationState = state.confirmation

  if (!confirmationState?.trackingCode) {
    return <Navigate to={routes.publicHome} replace />
  }

  const { trackingCode, title } = confirmationState

  return (
    <PublicLayout className="py-8 sm:py-12">
      <img src="/assets/icon_check.avif" alt="" width="240" height="240" className='size-60 mb-8 mx-auto' />
      <Title.h1 className="title-h3 text-center">Submission received</Title.h1>

      {title && (
        <div className="mt-6 flex w-full flex-col items-center gap-1 text-center">
          <Label.xs className="text-tertiary uppercase tracking-wider">{meta.typeLabel}</Label.xs>
          <Title.h5>{title}</Title.h5>
        </div>
      )}

      <div className="mt-8 flex w-full flex-col items-center gap-3">
        <Paragraph.md className="text-secondary">Save this tracking code</Paragraph.md>
        <Button.Surface aria-label="Copy tracking code" className="flex w-full max-w-sm items-center justify-center gap-3 rounded-xl border border-secondary bg-secondary/50 px-5 py-3" onClick={actions.copy}>
          <Title.h6 className="font-mono tracking-widest">{trackingCode}</Title.h6>
          {state.copied ? <Check className="size-4 text-success" /> : <Copy className="size-4 text-tertiary" />}
        </Button.Surface>
        <Paragraph.sm className="max-w-sm text-center text-tertiary">Keep this code private. Anyone who has it can view, update, or delete this submission.</Paragraph.sm>
      </div>

      {state.shareError && <Alert className="mx-auto mt-6 max-w-sm" title="Could not copy or share" description={state.shareError} variant="error" style="filled" />}

      <PublicFlow.Actions className="mx-auto mt-12 max-w-sm">
        <Button variant="secondary" icon={state.shared ? <Check /> : <Share2 />} onClick={actions.share} className="rounded-full px-6 py-3">
          {state.shared ? 'Shared' : 'Share tracking details'}
        </Button>
        <Button variant="secondary" onClick={actions.backToHome} className="rounded-full px-6 py-3">
          Back to home
        </Button>
      </PublicFlow.Actions>
    </PublicLayout>
  )
}
