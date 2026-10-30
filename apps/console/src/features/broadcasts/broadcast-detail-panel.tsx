import { ItemDiscussionPanel } from "@/features/item-discussion/item-discussion-panel"
import type { Broadcast } from "@moc/types/broadcast/broadcast"
import { Button } from "@moc/ui/components/controls/button"
import { DividedList } from "@moc/ui/components/display/divided-list"
import { MetaRow } from "@moc/ui/components/display/meta-row"
import { Section } from "@moc/ui/components/display/section"
import { SortableList } from "@moc/ui/components/display/sortable-list"
import { Paragraph, Title } from "@moc/ui/components/display/text"
import { InlineEditableText } from "@moc/ui/components/form/inline-editable-text"
import { SplitPanel } from "@moc/ui/components/layout/split-panel"
import { Check, Clock, Copy, Link2, ListMusic, Trash2, Upload } from "lucide-react"
import type { BroadcastEditorItem } from "./broadcast-editor-types"
import { BroadcastPlaylistItem } from "./broadcast-playlist-item"
import { BroadcastUploadModal } from "./broadcast-upload-modal"
import { useBroadcastDetail } from "./use-broadcast-detail"

type BroadcastDetailPanelProps = {
  broadcast: Broadcast
  canDelete: boolean
  onDelete: (broadcast: Broadcast) => void
}

export function BroadcastDetailPanel({ broadcast, canDelete, onDelete }: BroadcastDetailPanelProps) {
  const { state, actions, meta } = useBroadcastDetail(broadcast)

  function handleCopy(): void {
    void actions.copyPublicUrl()
  }

  function handleDelete(): void {
    onDelete(state.broadcast)
  }

  function renderItem(item: BroadcastEditorItem) {
    return (
      <SortableList.Item key={item.key} id={item.key} aria-label={item.source === "existing" ? item.item.title : item.file.name}>
        <BroadcastPlaylistItem
          item={item}
          kind={state.broadcast.kind}
          isLocked={state.isSaving || state.items.length === 1}
          onRemove={meta.canEdit ? actions.removeItem : undefined}
        />
      </SortableList.Item>
    )
  }

  return (
    <>
      <Paragraph.xs role="status" aria-live="polite" className="sr-only">{state.isSaving ? "Saving broadcast…" : ""}</Paragraph.xs>
      <SplitPanel.Header className="flex items-center gap-1">
        <SplitPanel.Close aria-label="Close broadcast" size="sm" />
        <div className="flex-1" />
        {canDelete ? <Button.Icon aria-label="Delete broadcast" variant="danger-secondary" size="sm" icon={<Trash2 />} disabled={state.isSaving} onClick={handleDelete} /> : null}
      </SplitPanel.Header>

      <SplitPanel.Content>
        <div className="flex flex-col gap-1">
          <Title.h6>
            {meta.canEdit ? (
              <InlineEditableText aria-label="Broadcast title" value={state.broadcast.title} onSave={actions.saveTitle} disabled={state.isSaving} className="w-full" />
            ) : state.broadcast.title}
          </Title.h6>
          {meta.canEdit ? (
            <Paragraph.sm className="text-tertiary">
              <InlineEditableText aria-label="Broadcast description" value={state.broadcast.description} onSave={actions.saveDescription} allowEmpty disabled={state.isSaving} placeholder="Add description" className="w-full whitespace-normal" />
            </Paragraph.sm>
          ) : state.broadcast.description ? <Paragraph.sm className="text-tertiary">{state.broadcast.description}</Paragraph.sm> : null}
        </div>

        <div className="flex flex-col gap-3">
          <MetaRow icon={<ListMusic />} label="Playlist"><Paragraph.sm>{meta.playlistLabel}</Paragraph.sm></MetaRow>
          <MetaRow icon={<Clock />} label="Last updated"><Paragraph.sm>{meta.updatedAt}</Paragraph.sm></MetaRow>
          <MetaRow icon={<Link2 />} label="Public link">
            {meta.publicUrl ? (
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <Paragraph.sm className="min-w-0 flex-1 truncate">{meta.publicUrl}</Paragraph.sm>
                <Button.Icon aria-label="Copy public link" variant="ghost" size="sm" icon={state.copiedField === "link" ? <Check className="text-success" /> : <Copy />} onClick={handleCopy} />
              </div>
            ) : <Paragraph.sm className="text-quaternary">Set VITE_BROADCAST_APP_URL to build player links.</Paragraph.sm>}
          </MetaRow>
        </div>

        <Section>
          <Section.Header title="Play order" size="sm" actions={meta.canEdit ? <Button variant="secondary" size="sm" icon={<Upload />} disabled={state.isSaving} onClick={actions.openUpload}>Upload</Button> : null} />
          <SortableList.Root items={meta.itemKeys} onReorder={actions.reorderItem} disabled={!meta.canEdit || state.isSaving || state.items.length < 2}>
            <DividedList>{state.items.map(renderItem)}</DividedList>
          </SortableList.Root>
        </Section>
        <ItemDiscussionPanel kind="broadcast" itemId={broadcast.id} />
      </SplitPanel.Content>
      <BroadcastUploadModal broadcast={broadcast} open={state.uploadOpen} onOpenChange={actions.changeUploadOpen} onSubmit={actions.submitUploads} />
    </>
  )
}
