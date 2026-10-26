import { useDetailLinkState } from "@/hooks/use-detail-return"
import type { Request } from "@moc/types/requests"
import { Button } from "@moc/ui/components/controls/button"
import { CreateStreamModal } from "@/features/streams/create-stream-modal"
import { CreateChecklistRunModal } from "@/features/checklists/create-checklist-run-modal"
import { useRequestWorkActions } from "./use-request-work-actions"
import type { RequestLinkedRecord } from "@/data/request-links"
import { LinkedRecordRow } from "@moc/ui/components/display/linked-record-row"
import { MetaRow } from "@moc/ui/components/display/meta-row"
import { Paragraph } from "@moc/ui/components/display/text"
import { RetryAlert } from "@moc/ui/components/feedback/retry-alert"
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner"
import { RecordPicker } from "@moc/ui/components/form/record-picker"
import { Dropdown } from "@moc/ui/components/overlays/dropdown"
import { Link2, Plus } from "lucide-react"
import { Link } from "react-router-dom"
import { useRequestLinkedRecords } from "./use-request-linked-records"

type RequestLinkedRecordsProps = { request: Request; enabled?: boolean }

export function RequestLinkedRecords({ request, enabled = true }: RequestLinkedRecordsProps) {
  const linkState = useDetailLinkState()
  const { state, actions, meta } = useRequestLinkedRecords(request.id, enabled)
  const creation = useRequestWorkActions({ request, enabled, refreshRecords: actions.retry })
  function renderRecord(record: RequestLinkedRecord) {
    function handleUnlink() {
      actions.unlink(record)
    }
    return (
      <LinkedRecordRow key={record.key} label={record.label} render={<Link state={linkState} to={record.href} />} onRemove={meta.canUpdate ? handleUnlink : undefined} disabled={state.isSaving} />
    )
  }

  return (
    <>
      <MetaRow icon={<Link2 />} label="Linked work">
        <div className="flex min-w-0 flex-col gap-1">
          {state.isLoading ? <LoadingSpinner size="sm" className="h-control-sm justify-start px-3" /> : state.error ? <RetryAlert title="Could not load related work" description={state.error.message} onRetry={actions.retry} /> : <>
            {state.records.map(renderRecord)}
            {!state.records.length && !meta.canUpdate && <Paragraph.sm className="text-tertiary">Not linked</Paragraph.sm>}
            <div className="flex min-w-0 items-center gap-1">
              {meta.canUpdate && <div className="min-w-0 flex-1"><RecordPicker label="Link existing work" placeholder={state.options.length ? "Link existing work…" : "No unlinked records available"} options={state.options} value={null} onSelect={actions.link} disabled={state.isSaving || !state.options.length} style="ghost" size="sm" /></div>}
              {(creation.meta.canCreate || creation.meta.canCreateStream) && (
                <Dropdown placement="bottom">
                  <Dropdown.Trigger><Button.Icon aria-label="Create linked work" size="sm" variant="ghost" icon={<Plus />} /></Dropdown.Trigger>
                  <Dropdown.Panel>
                    {creation.meta.canCreate && <Dropdown.Item onSelect={creation.actions.openChecklist}>Create checklist</Dropdown.Item>}
                    {creation.meta.canCreateStream && <Dropdown.Item onSelect={creation.actions.openStream}>Create stream or meeting</Dropdown.Item>}
                  </Dropdown.Panel>
                </Dropdown>
              )}
            </div>
          </>}
        </div>
      </MetaRow>
      <CreateChecklistRunModal open={creation.state.checklistOpen} onOpenChange={creation.actions.setChecklistOpen} template={null} onSubmit={creation.actions.createChecklist} initialName={request.title} />
      {creation.state.streamOpen && <CreateStreamModal open={creation.state.streamOpen} onOpenChange={creation.actions.setStreamOpen} youtubeAvailable={creation.meta.youtubeAvailable} zoomAvailable={creation.meta.zoomAvailable} youtubePreset={creation.meta.youtubePreset} onCreateYouTube={creation.actions.createYouTube} onCreateZoom={creation.actions.createZoom} initialTitle={request.title} initialScheduledAt={request.dueDate} />}
    </>
  )
}
