import { cn } from "@moc/utils/cn"
import { useDetailLinkState } from "@/hooks/use-detail-return"
import type { RequestLinkedKind } from "@/data/request-links"
import { routes } from "@/screens/console-routes"
import { FileText } from "lucide-react"
import { LinkedRecordRow } from "@moc/ui/components/display/linked-record-row"
import { MetaRow } from "@moc/ui/components/display/meta-row"
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

  function renderValue() {
    if (state.isLoading) return <LoadingSpinner size="sm" className="h-control-sm max-h-control-sm justify-start px-2.5 landscape:h-control-lg landscape:max-h-control-lg" />
    if (state.requestId) return <LinkedRecordRow label={state.label} render={<Link state={linkState} to={`/${routes.requests}/${state.requestId}`} />} onRemove={meta.canUpdate ? actions.unlink : undefined} disabled={state.isSaving} />
    if (meta.canUpdate) return <RecordPicker label="Origin request" placeholder="Link a request…" options={state.options} value={state.requestId} onSelect={actions.select} disabled={state.isSaving || !state.options.length} style="ghost" size="sm" />
    return <Paragraph.sm className="text-tertiary">Not linked</Paragraph.sm>
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <MetaRow icon={<FileText />} label="Request">{renderValue()}</MetaRow>
      {state.error && <RetryAlert title="Could not load request link" description={state.error.message} onRetry={actions.retry} />}
    </div>
  )
}
