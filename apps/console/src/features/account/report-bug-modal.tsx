import type { BugReportErrorContext } from "@/data/bug-reports"
import { Button } from "@moc/ui/components/controls/button"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import { Alert } from "@moc/ui/components/feedback/alert"
import { TextArea } from "@moc/ui/components/form/text-area"
import { Modal } from "@moc/ui/components/overlays/modal"
import { BUG_REPORT_MAX_LENGTH, BUG_REPORT_MIN_LENGTH, useReportBugForm } from "./use-report-bug-form"

type ReportBugModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  errorContext?: BugReportErrorContext | null
}

export function ReportBugModal({ open, onOpenChange, errorContext }: ReportBugModalProps) {
  const { state, actions, meta } = useReportBugForm(open, onOpenChange, errorContext)

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <Modal.Portal>
        <Modal.Backdrop />
        <Modal.Positioner>
          <Modal.FullScreenPanel className="w-full md:!max-w-md">
            <Modal.Header><Label.md>Report a bug</Label.md></Modal.Header>
            <Modal.Content>
              <div className="flex flex-col gap-3 p-4">
                {errorContext && <Alert variant="info" title="The page error will be attached automatically." />}
                <TextArea
                  aria-label="Bug report description"
                  autoComplete="off"
                  name="bug-description"
                  rows={6}
                  maxLength={BUG_REPORT_MAX_LENGTH}
                  placeholder="What were you doing, and what happened?"
                  value={state.description}
                  onChange={actions.changeDescription}
                />
                <div className="flex items-center justify-between">
                  <Paragraph.xs className="text-quaternary">{meta.trimmedLength < BUG_REPORT_MIN_LENGTH ? `At least ${BUG_REPORT_MIN_LENGTH} characters` : ""}</Paragraph.xs>
                  <Paragraph.xs className={meta.remaining < 100 ? "text-error" : "text-quaternary"}>{meta.remaining}</Paragraph.xs>
                </div>
              </div>
            </Modal.Content>
            <Modal.Footer>
              <Modal.Close><Button variant="secondary">Cancel</Button></Modal.Close>
              <Button onClick={actions.submit} disabled={!meta.canSubmit}>{state.isSubmitting ? "Sending…" : "Send report"}</Button>
            </Modal.Footer>
          </Modal.FullScreenPanel>
        </Modal.Positioner>
      </Modal.Portal>
    </Modal>
  )
}
