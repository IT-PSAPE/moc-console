import { useDetailLinkState } from "@/hooks/use-detail-return"
import type { Request } from "@moc/types/requests"
import { Button } from "@moc/ui/components/controls/button"
import { CreateStreamModal } from "@/features/streams/create-stream-modal"
import { CreateChecklistRunModal } from "@/features/checklists/create-checklist-run-modal"
import { useRequestWorkActions } from "./use-request-work-actions"
import type { RequestLinkedRecord } from "@/data/request-links"
import { LinkedRecordRow } from "@moc/ui/components/display/linked-record-row"
import { Section } from "@moc/ui/components/display/section"
import { Paragraph } from "@moc/ui/components/display/text"
import { RetryAlert } from "@moc/ui/components/feedback/retry-alert"
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner"
import { RecordPicker } from "@moc/ui/components/form/record-picker"
import { Link } from "react-router-dom"
import { useRequestLinkedRecords } from "./use-request-linked-records"

type RequestLinkedRecordsProps = { request: Request; enabled?: boolean; className?: string }

export function RequestLinkedRecords({ request, enabled = true, className }: RequestLinkedRecordsProps) {
  const linkState = useDetailLinkState()
  const { state, actions, meta } = useRequestLinkedRecords(request.id, enabled)
  const creation = useRequestWorkActions({ request, enabled, refreshRecords: actions.retry })
  function renderRecord(record: RequestLinkedRecord) {
    function remove() { actions.unlink(record) }
    return <LinkedRecordRow key={record.key} label={record.label} detail={record.detail} render={<Link state={linkState} to={record.href} />} onRemove={meta.canUpdate ? remove : undefined} disabled={state.isSaving} />
  }

  return (
    <Section className={className}>
      <Section.Header title="Related work" />
      <Section.Body className="gap-3">
        {state.isLoading ? <LoadingSpinner className="py-3" /> : state.error ? <RetryAlert title="Could not load related work" description={state.error.message} onRetry={actions.retry} /> : <>
          {state.records.length ? state.records.map(renderRecord) : <Paragraph.sm className="text-tertiary">No work linked to this request.</Paragraph.sm>}
          {meta.canUpdate && <RecordPicker label="Link existing work" placeholder={state.options.length ? "Link existing…" : "No unlinked records available"} options={state.options} value={null} onSelect={actions.link} disabled={state.isSaving || !state.options.length} />}
        </>}
        {creation.meta.canCreate && <Button variant="secondary" onClick={creation.actions.openChecklist}>Create checklist</Button>}
        {creation.meta.canCreateStream && <Button variant="secondary" onClick={creation.actions.openStream}>Create stream or meeting</Button>}
      </Section.Body>
      <CreateChecklistRunModal open={creation.state.checklistOpen} onOpenChange={creation.actions.setChecklistOpen} template={null} onSubmit={creation.actions.createChecklist} initialName={request.title} />
      {creation.state.streamOpen && <CreateStreamModal open={creation.state.streamOpen} onOpenChange={creation.actions.setStreamOpen} youtubeAvailable={creation.meta.youtubeAvailable} zoomAvailable={creation.meta.zoomAvailable} youtubePreset={creation.meta.youtubePreset} onCreateYouTube={creation.actions.createYouTube} onCreateZoom={creation.actions.createZoom} initialTitle={request.title} initialScheduledAt={request.dueDate} />}
    </Section>
  )
}
