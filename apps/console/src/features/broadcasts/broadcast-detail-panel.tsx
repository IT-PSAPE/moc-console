import type { Broadcast, BroadcastItem } from "@moc/types/broadcast/broadcast"
import { BROADCAST_KIND_LABELS } from "@moc/types/broadcast/broadcast-constants"
import { Button } from "@moc/ui/components/controls/button"
import { Divider } from "@moc/ui/components/display/divider"
import { ListItemCard } from "@moc/ui/components/display/list-item-card"
import { MetaRow } from "@moc/ui/components/display/meta-row"
import { Label, Paragraph, Title } from "@moc/ui/components/display/text"
import { SplitPanel } from "@moc/ui/components/layout/split-panel"
import { formatUtcIsoInBrowserTimeZone } from "@moc/utils/browser-date-time"
import { Check, Clock, Copy, FileAudio, FileVideo, Link2, ListMusic, Pencil } from "lucide-react"
import { formatFileSize } from "@moc/utils/file-constraints"
import { useBroadcastDetail } from "./use-broadcast-detail"

type BroadcastDetailPanelProps = {
  broadcast: Broadcast
  canEdit: boolean
  onEdit: (broadcast: Broadcast) => void
}

function formatItemCount(count: number): string {
  return `${count} ${count === 1 ? "item" : "items"}`
}

export function BroadcastDetailPanel({ broadcast, canEdit, onEdit }: BroadcastDetailPanelProps) {
  const detail = useBroadcastDetail(broadcast, onEdit)

  function handleCopy() {
    void detail.actions.copyPublicUrl()
  }

  function renderItem(item: BroadcastItem, index: number) {
    return (
      <ListItemCard.Root key={item.id} className="px-0">
        <ListItemCard.Leading className="size-9">{broadcast.kind === "audio" ? <FileAudio /> : <FileVideo />}</ListItemCard.Leading>
        <ListItemCard.Content>
          <ListItemCard.Title>{item.title}</ListItemCard.Title>
          <ListItemCard.Meta>
            <ListItemCard.MetaItem>{`Position ${index + 1}`}</ListItemCard.MetaItem>
            <ListItemCard.MetaItem>{formatFileSize(item.fileSizeBytes)}</ListItemCard.MetaItem>
          </ListItemCard.Meta>
        </ListItemCard.Content>
      </ListItemCard.Root>
    )
  }

  return (
    <>
      <Paragraph.xs role="status" aria-live="polite" className="sr-only">{detail.state.copyMessage}</Paragraph.xs>
      <SplitPanel.Header className="flex items-center gap-1">
        <SplitPanel.Close aria-label="Close broadcast" />
        <div className="flex-1" />
        {canEdit ? <Button.Icon aria-label="Edit broadcast" variant="ghost" icon={<Pencil />} onClick={detail.actions.edit} /> : null}
      </SplitPanel.Header>

      <SplitPanel.Content className="py-4">
        <div className="px-4 pb-4">
          <Title.h6>{broadcast.title}</Title.h6>
          {broadcast.description ? <Paragraph.sm className="mt-1 text-tertiary">{broadcast.description}</Paragraph.sm> : null}
        </div>

        <div className="space-y-3 px-4">
          <MetaRow icon={<ListMusic />} label="Playlist">
            <Paragraph.xs>{`${BROADCAST_KIND_LABELS[broadcast.kind]} · ${formatItemCount(broadcast.items.length)}`}</Paragraph.xs>
          </MetaRow>

          <MetaRow icon={<Clock />} label="Last updated">
            <Paragraph.xs>{formatUtcIsoInBrowserTimeZone(broadcast.updatedAt, { dateStyle: "medium", timeStyle: "short" })}</Paragraph.xs>
          </MetaRow>

          <MetaRow icon={<Link2 />} label="Public link">
            {detail.meta.publicUrl ? (
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <Paragraph.xs className="min-w-0 flex-1 truncate">{detail.meta.publicUrl}</Paragraph.xs>
                <Button.Icon
                  aria-label="Copy public link"
                  variant="ghost"
                  icon={detail.state.copiedField === "link" ? <Check className="text-utility-green-700" /> : <Copy />}
                  onClick={handleCopy}
                />
              </div>
            ) : (
              <Paragraph.xs className="text-quaternary">Set VITE_BROADCAST_APP_URL to build player links.</Paragraph.xs>
            )}
          </MetaRow>
        </div>

        <Divider className="my-4" />

        <div className="px-4">
          <Label.xs className="text-tertiary">Play order</Label.xs>
          <div className="mt-1.5 flex flex-col">{broadcast.items.map(renderItem)}</div>
        </div>
      </SplitPanel.Content>
    </>
  )
}
