import { useDetailLinkState } from "@/hooks/use-detail-return"
import type { Request } from "@moc/types/requests"
import { Button } from "@moc/ui/components/controls/button"
import { CreateStreamModal } from "@/features/streams/create-stream-modal"
import { CreateChecklistRunModal } from "@/features/checklists/create-checklist-run-modal"
import { useRequestWorkActions } from "./use-request-work-actions"
import type { RequestLinkedKind, RequestLinkedRecord } from "@/data/request-links"
import { DividedList } from "@moc/ui/components/display/divided-list"
import { ListItemCard } from "@moc/ui/components/display/list-item-card"
import { Section } from "@moc/ui/components/display/section"
import { Paragraph } from "@moc/ui/components/display/text"
import { RetryAlert } from "@moc/ui/components/feedback/retry-alert"
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner"
import { RecordPicker } from "@moc/ui/components/form/record-picker"
import { ArrowUpRight, Boxes, Building2, ClipboardList, Radio, Unlink, Video } from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { useRequestLinkedRecords } from "./use-request-linked-records"

type RequestLinkedRecordsProps = { request: Request; enabled?: boolean }

const kindIcon: Record<RequestLinkedKind, ReactNode> = {
  checklist: <ClipboardList />,
  booking: <Boxes />,
  "venue-booking": <Building2 />,
  stream: <Radio />,
  meeting: <Video />,
}

export function RequestLinkedRecords({ request, enabled = true }: RequestLinkedRecordsProps) {
  const linkState = useDetailLinkState()
  const { state, actions, meta } = useRequestLinkedRecords(request.id, enabled)
  const creation = useRequestWorkActions({ request, enabled, refreshRecords: actions.retry })
  function renderRecord(record: RequestLinkedRecord) {
    function handleUnlink() {
      actions.unlink(record)
    }
    return (
      <ListItemCard.Root key={record.key}>
        <ListItemCard.Leading>{kindIcon[record.kind]}</ListItemCard.Leading>
        <ListItemCard.Content>
          <ListItemCard.Title>
            <Link state={linkState} to={record.href} className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-brand">{record.label}</Link>
          </ListItemCard.Title>
          {record.detail ? <ListItemCard.Subtitle>{record.detail}</ListItemCard.Subtitle> : null}
        </ListItemCard.Content>
        <ListItemCard.Trailing className="gap-1 @max-[36rem]/row:basis-auto @max-[36rem]/row:justify-end">
          <Button.IconLink size="sm" variant="ghost" aria-label={`Open ${record.label}`} icon={<ArrowUpRight />} render={<Link state={linkState} to={record.href} />} />
          {meta.canUpdate ? <Button.Icon size="sm" variant="ghost" aria-label={`Unlink ${record.label}`} icon={<Unlink />} onClick={handleUnlink} disabled={state.isSaving} /> : null}
        </ListItemCard.Trailing>
      </ListItemCard.Root>
    )
  }

  return (
    <Section>
      <Section.Header size="sm" title="Linked work" />
      <Section.Body className="gap-3">
        {state.isLoading ? <LoadingSpinner className="py-3" /> : state.error ? <RetryAlert title="Could not load related work" description={state.error.message} onRetry={actions.retry} /> : <>
          {state.records.length ? <DividedList>{state.records.map(renderRecord)}</DividedList> : <Paragraph.sm className="text-tertiary">No work linked to this request.</Paragraph.sm>}
          {meta.canUpdate && <RecordPicker label="Link existing work" placeholder={state.options.length ? "Link existing…" : "No unlinked records available"} options={state.options} value={null} onSelect={actions.link} disabled={state.isSaving || !state.options.length} />}
        </>}
        {(creation.meta.canCreate || creation.meta.canCreateStream) && (
          <div className="flex flex-wrap gap-2">
            {creation.meta.canCreate && <Button size="sm" variant="secondary" onClick={creation.actions.openChecklist}>Create checklist</Button>}
            {creation.meta.canCreateStream && <Button size="sm" variant="secondary" onClick={creation.actions.openStream}>Create stream or meeting</Button>}
          </div>
        )}
      </Section.Body>
      <CreateChecklistRunModal open={creation.state.checklistOpen} onOpenChange={creation.actions.setChecklistOpen} template={null} onSubmit={creation.actions.createChecklist} initialName={request.title} />
      {creation.state.streamOpen && <CreateStreamModal open={creation.state.streamOpen} onOpenChange={creation.actions.setStreamOpen} youtubeAvailable={creation.meta.youtubeAvailable} zoomAvailable={creation.meta.zoomAvailable} youtubePreset={creation.meta.youtubePreset} onCreateYouTube={creation.actions.createYouTube} onCreateZoom={creation.actions.createZoom} initialTitle={request.title} initialScheduledAt={request.dueDate} />}
    </Section>
  )
}
