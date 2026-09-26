import { Button } from '@moc/ui/components/controls/button'
import { Card } from '@moc/ui/components/display/card'
import { Label, Paragraph } from '@moc/ui/components/display/text'
import { ConfirmationDialog } from '@moc/ui/components/overlays/confirmation-dialog'
import type { SubmissionDraftKind } from '@/data/submission-draft-storage'
import type { SubmissionDraftSummary } from '@/features/hooks/use-submission-drafts'

type SubmissionDraftsProps = {
  drafts: SubmissionDraftSummary[]
  discardOpen: boolean
  onContinue: (route: string) => void
  onRequestDiscard: (kind: SubmissionDraftKind) => void
  onDiscardOpenChange: (open: boolean) => void
  onConfirmDiscard: () => void
}

export function SubmissionDrafts({ drafts, discardOpen, onContinue, onRequestDiscard, onDiscardOpenChange, onConfirmDiscard }: SubmissionDraftsProps) {
  function renderDraft(draft: SubmissionDraftSummary) {
    function handleContinue() {
      onContinue(draft.route)
    }

    function handleDiscard() {
      onRequestDiscard(draft.kind)
    }

    return (
      <Card.Content key={draft.kind} className="flex min-w-0 flex-col gap-1 px-2 py-1.5 @xs/drafts:flex-row @xs/drafts:items-center @xs/drafts:gap-4">
        <div className="min-w-0 flex-1">
          <Label.sm>{draft.title}</Label.sm>
          <Paragraph.xs className="truncate text-tertiary">{draft.description}</Paragraph.xs>
        </div>
        <div className="-my-1 flex shrink-0 items-center gap-4 @xs/drafts:ml-auto">
          <Button.Unstyled type="button" onClick={handleDiscard} className="min-h-11 rounded-sm text-secondary underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2">
            <Label.sm className="text-[inherit]">Discard</Label.sm>
          </Button.Unstyled>
          <Button.Unstyled type="button" onClick={handleContinue} className="min-h-11 rounded-sm text-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2">
            <Label.sm className="text-[inherit]">Continue</Label.sm>
          </Button.Unstyled>
        </div>
      </Card.Content>
    )
  }

  return (
    <Card className="@container/drafts gap-1 p-1">
      <Card.Header tight className="px-2">
        <Label.md>Drafts</Label.md>
      </Card.Header>
      {drafts.map(renderDraft)}
      <ConfirmationDialog
        open={discardOpen}
        onOpenChange={onDiscardOpenChange}
        title="Discard draft?"
        description="This will permanently remove the saved draft from this device."
        confirmLabel="Discard"
        onConfirm={onConfirmDiscard}
      />
    </Card>
  )
}
