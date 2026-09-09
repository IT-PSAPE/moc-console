import type { BroadcastKind } from "@moc/types/broadcast/broadcast"
import { Button } from "@moc/ui/components/controls/button"
import { ListItemCard } from "@moc/ui/components/display/list-item-card"
import { ArrowDown, ArrowUp, FileAudio, FileVideo, Trash2 } from "lucide-react"
import type { BroadcastEditorItem } from "./broadcast-editor-types"
import { formatFileSize } from "@moc/utils/file-constraints"

type BroadcastPlaylistItemProps = {
  isFirst: boolean
  isLast: boolean
  isLocked: boolean
  item: BroadcastEditorItem
  kind: BroadcastKind
  onMove: (key: string, direction: -1 | 1) => void
  onRemove: (key: string) => void
}

const uploadStatusLabels = { complete: "Uploaded", error: "Upload failed", queued: "Ready to upload", uploading: "Uploading…" } as const

function getItemTitle(item: BroadcastEditorItem): string {
  return item.source === "existing" ? item.item.title : item.file.name
}

function getItemSize(item: BroadcastEditorItem): number {
  return item.source === "existing" ? item.item.fileSizeBytes : item.file.size
}

function getItemStatus(item: BroadcastEditorItem): string | null {
  if (item.source === "existing") return null
  return item.error ?? uploadStatusLabels[item.status]
}

export function BroadcastPlaylistItem({ isFirst, isLast, isLocked, item, kind, onMove, onRemove }: BroadcastPlaylistItemProps) {
  const title = getItemTitle(item)
  const status = getItemStatus(item)
  const hasFailed = item.source === "upload" && item.status === "error"

  function handleMoveUp() {
    onMove(item.key, -1)
  }

  function handleMoveDown() {
    onMove(item.key, 1)
  }

  function handleRemove() {
    onRemove(item.key)
  }

  return (
    <ListItemCard.Root className="rounded-md border border-tertiary bg-primary px-2 py-2">
      <ListItemCard.Leading className="size-9">{kind === "audio" ? <FileAudio /> : <FileVideo />}</ListItemCard.Leading>
      <ListItemCard.Content>
        <ListItemCard.Title>{title}</ListItemCard.Title>
        <ListItemCard.Meta>
          <ListItemCard.MetaItem>{formatFileSize(getItemSize(item))}</ListItemCard.MetaItem>
          {status ? (
            <ListItemCard.MetaItem
              aria-live={hasFailed ? "assertive" : "polite"}
              className={hasFailed ? "text-error" : undefined}
              role={hasFailed ? "alert" : "status"}
            >
              {status}
            </ListItemCard.MetaItem>
          ) : null}
        </ListItemCard.Meta>
      </ListItemCard.Content>
      <ListItemCard.Trailing>
        <Button.Icon aria-label={`Move ${title} earlier`} variant="ghost" icon={<ArrowUp />} disabled={isLocked || isFirst} onClick={handleMoveUp} />
        <Button.Icon aria-label={`Move ${title} later`} variant="ghost" icon={<ArrowDown />} disabled={isLocked || isLast} onClick={handleMoveDown} />
        <Button.Icon aria-label={`Remove ${title}`} variant="ghost" icon={<Trash2 />} disabled={isLocked} onClick={handleRemove} />
      </ListItemCard.Trailing>
    </ListItemCard.Root>
  )
}
