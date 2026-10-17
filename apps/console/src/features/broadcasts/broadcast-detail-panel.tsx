import type { Broadcast, BroadcastItem } from "@moc/types/broadcast/broadcast"
import { BROADCAST_KIND_LABELS } from "@moc/types/broadcast/broadcast-constants"
import { Button } from "@moc/ui/components/controls/button"
import { DividedList } from "@moc/ui/components/display/divided-list"
import { ListItemCard } from "@moc/ui/components/display/list-item-card"
import { MetaRow } from "@moc/ui/components/display/meta-row"
import { Section } from "@moc/ui/components/display/section"
import { Paragraph, Title } from "@moc/ui/components/display/text"
import { SplitPanel } from "@moc/ui/components/layout/split-panel"
import { formatUtcIsoInBrowserTimeZone } from "@moc/utils/browser-date-time"
import { Check, Clock, Copy, FileAudio, FileVideo, Link2, ListMusic, Pencil, Trash2 } from "lucide-react"
import { formatFileSize } from "@moc/utils/file-constraints"
import { useBroadcastDetail } from "./use-broadcast-detail"

type BroadcastDetailPanelProps = {
  broadcast: Broadcast
  canDelete: boolean
  canEdit: boolean
  onDelete: (broadcast: Broadcast) => void
  onEdit: (broadcast: Broadcast) => void
}

function formatItemCount(count: number): string {
  return `${count} ${count === 1 ? "item" : "items"}`
}

export function BroadcastDetailPanel({ broadcast, canDelete, canEdit, onDelete, onEdit }: BroadcastDetailPanelProps) {
  const detail = useBroadcastDetail(broadcast, onEdit)

  function handleCopy() {
    void detail.actions.copyPublicUrl()
  }

  function handleDelete() {
    onDelete(broadcast)
  }

  function renderItem(item: BroadcastItem, index: number) {
    return (
      <ListItemCard.Root key={item.id}>
        <ListItemCard.Leading>{broadcast.kind === "audio" ? <FileAudio /> : <FileVideo />}</ListItemCard.Leading>
        <ListItemCard.Content>
          <ListItemCard.Title>{item.title}</ListItemCard.Title>
        </ListItemCard.Content>
        <ListItemCard.Trailing>
          <ListItemCard.Meta>
            <ListItemCard.MetaItem>{`Position ${index + 1} · ${formatFileSize(item.fileSizeBytes)}`}</ListItemCard.MetaItem>
          </ListItemCard.Meta>
        </ListItemCard.Trailing>
      </ListItemCard.Root>
    )
  }

  return (
    <>
      <Paragraph.xs role="status" aria-live="polite" className="sr-only">{detail.state.copyMessage}</Paragraph.xs>
      <SplitPanel.Header className="flex items-center gap-1">
        <SplitPanel.Close aria-label="Close broadcast" size="sm" />
        <div className="flex-1" />
        {canEdit ? <Button.Icon aria-label="Edit broadcast" variant="ghost" size="sm" icon={<Pencil />} onClick={detail.actions.edit} /> : null}
        {canDelete ? <Button.Icon aria-label="Delete broadcast" variant="danger-secondary" size="sm" icon={<Trash2 />} onClick={handleDelete} /> : null}
      </SplitPanel.Header>

      <SplitPanel.Content>
        <div className="flex flex-col gap-1">
          <Title.h6>{broadcast.title}</Title.h6>
          {broadcast.description ? <Paragraph.sm className="text-tertiary">{broadcast.description}</Paragraph.sm> : null}
        </div>

        <div className="flex flex-col gap-3">
          <MetaRow icon={<ListMusic />} label="Playlist">
            <Paragraph.sm>{`${BROADCAST_KIND_LABELS[broadcast.kind]} · ${formatItemCount(broadcast.items.length)}`}</Paragraph.sm>
          </MetaRow>

          <MetaRow icon={<Clock />} label="Last updated">
            <Paragraph.sm>{formatUtcIsoInBrowserTimeZone(broadcast.updatedAt, { dateStyle: "medium", timeStyle: "short" })}</Paragraph.sm>
          </MetaRow>

          <MetaRow icon={<Link2 />} label="Public link">
            {detail.meta.publicUrl ? (
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <Paragraph.sm className="min-w-0 flex-1 truncate">{detail.meta.publicUrl}</Paragraph.sm>
                <Button.Icon
                  aria-label="Copy public link"
                  variant="ghost"
                  size="sm"
                  icon={detail.state.copiedField === "link" ? <Check className="text-success" /> : <Copy />}
                  onClick={handleCopy}
                />
              </div>
            ) : (
              <Paragraph.sm className="text-quaternary">Set VITE_BROADCAST_APP_URL to build player links.</Paragraph.sm>
            )}
          </MetaRow>
        </div>

        <Section>
          <Section.Header title="Play order" size="sm" />
          <DividedList>{broadcast.items.map(renderItem)}</DividedList>
        </Section>
      </SplitPanel.Content>
    </>
  )
}
