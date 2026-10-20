import type { BroadcastKind } from "@moc/types/broadcast/broadcast"
import { Button } from "@moc/ui/components/controls/button"
import { ListItemCard } from "@moc/ui/components/display/list-item-card"
import { FileAudio, FileVideo, X } from "lucide-react"
import type { BroadcastEditorItem } from "./broadcast-editor-types"
import { getBroadcastPlaylistItemSize, getBroadcastPlaylistItemStatus, getBroadcastPlaylistItemTitle } from "./broadcast-playlist-item-data"

type BroadcastPlaylistItemProps = {
  isLocked: boolean
  item: BroadcastEditorItem
  kind: BroadcastKind
  onRemove?: (key: string) => void
}

export function BroadcastPlaylistItem({ isLocked, item, kind, onRemove }: BroadcastPlaylistItemProps) {
  const title = getBroadcastPlaylistItemTitle(item)
  const status = getBroadcastPlaylistItemStatus(item)
  const size = getBroadcastPlaylistItemSize(item)
  const hasFailed = item.source === "upload" && item.status === "error"

  function handleRemove() {
    onRemove?.(item.key)
  }

  return (
    <ListItemCard.Root className="group/playlist-item flex-nowrap px-2 py-2">
      <ListItemCard.Leading>{kind === "audio" ? <FileAudio /> : <FileVideo />}</ListItemCard.Leading>
      <ListItemCard.Content>
        <ListItemCard.Title>{title}</ListItemCard.Title>
        <ListItemCard.Meta>
          <ListItemCard.MetaItem>{size}</ListItemCard.MetaItem>
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
      {onRemove ? <ListItemCard.Trailing className="@max-[36rem]/row:basis-auto @max-[36rem]/row:justify-end opacity-0 transition-opacity group-hover/playlist-item:opacity-100 group-focus-within/playlist-item:opacity-100 [@media(hover:none)]:opacity-100">
        <Button.Icon aria-label={`Remove ${title}`} variant="ghost" icon={<X />} disabled={isLocked} onClick={handleRemove} />
      </ListItemCard.Trailing> : null}
    </ListItemCard.Root>
  )
}
