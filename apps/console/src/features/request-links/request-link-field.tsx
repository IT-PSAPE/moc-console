import { useDetailLinkState } from "@/hooks/use-detail-return"
import type { RequestLinkedKind } from "@/data/request-links"
import { routes } from "@/screens/console-routes"
import { LinkedRecordRow } from "@moc/ui/components/display/linked-record-row"
import { Section } from "@moc/ui/components/display/section"
import { Paragraph } from "@moc/ui/components/display/text"
import { RetryAlert } from "@moc/ui/components/feedback/retry-alert"
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner"
import { RecordPicker } from "@moc/ui/components/form/record-picker"
import { Link } from "react-router-dom"
import { useRequestLink } from "./use-request-link"

type RequestLinkFieldProps = { kind: RequestLinkedKind; id: string; className?: string }

export function RequestLinkField({ kind, id, className }: RequestLinkFieldProps) {
  const linkState = useDetailLinkState()
  const { state, actions, meta } = useRequestLink(kind, id)

  return (
    <Section className={className}>
      <Section.Header title="Origin request" />
      <Section.Body className="gap-2">
        {state.isLoading ? <LoadingSpinner className="py-3" /> : state.error ? <RetryAlert title="Could not load request link" description={state.error.message} onRetry={actions.retry} /> : <>
          {state.requestId ? <LinkedRecordRow label={state.label} render={<Link state={linkState} to={`/${routes.requests}/${state.requestId}`} />} onRemove={meta.canUpdate ? actions.unlink : undefined} disabled={state.isSaving} /> : <Paragraph.sm className="text-tertiary">Independent record</Paragraph.sm>}
          {meta.canUpdate && <RecordPicker label="Origin request" placeholder="Link a request…" options={state.options} value={state.requestId} onSelect={actions.select} disabled={state.isSaving || !state.options.length} />}
        </>}
      </Section.Body>
    </Section>
  )
}
