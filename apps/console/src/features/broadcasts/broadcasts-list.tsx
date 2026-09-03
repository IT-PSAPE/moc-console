import type { Broadcast } from "@moc/types/broadcast/broadcast"
import { BROADCAST_KIND_LABELS } from "@moc/types/broadcast/broadcast-constants"
import { Button } from "@moc/ui/components/controls/button"
import { GroupedList } from "@moc/ui/components/display/grouped-list"
import { ListItemCard } from "@moc/ui/components/display/list-item-card"
import { Label } from "@moc/ui/components/display/text"
import { Copy, Link2, ListVideo, Music4 } from "lucide-react"

type BroadcastsListProps = {
  broadcasts: Broadcast[]
  onCopyPublicLink: (broadcast: Broadcast) => void
}

function formatItemCount(count: number): string {
  return `${count} ${count === 1 ? "item" : "items"}`
}

function formatPublicationStatus(isPublished: boolean): string {
  return isPublished ? "Published" : "Draft"
}

function formatLoopStatus(loopEnabled: boolean): string {
  return loopEnabled ? "Loop on" : "Loop off"
}

function getBroadcastIcon(kind: Broadcast["kind"]) {
  return kind === "audio" ? <Music4 /> : <ListVideo />
}

export function BroadcastsList({ broadcasts, onCopyPublicLink }: BroadcastsListProps) {
  function createCopyHandler(broadcast: Broadcast) {
    return function copyPublicLink() {
      onCopyPublicLink(broadcast)
    }
  }

  function renderBroadcast(broadcast: Broadcast) {
    return (
      <ListItemCard key={broadcast.id}>
        <ListItemCard.Leading>{getBroadcastIcon(broadcast.kind)}</ListItemCard.Leading>
        <ListItemCard.Content>
          <ListItemCard.Title>{broadcast.title}</ListItemCard.Title>
          <ListItemCard.Subtitle>{broadcast.description || `${BROADCAST_KIND_LABELS[broadcast.kind]} broadcast`}</ListItemCard.Subtitle>
          <ListItemCard.Meta>
            <ListItemCard.MetaItem>{BROADCAST_KIND_LABELS[broadcast.kind]}</ListItemCard.MetaItem>
            <ListItemCard.MetaItem>{formatItemCount(broadcast.items.length)}</ListItemCard.MetaItem>
            <ListItemCard.MetaItem>{formatLoopStatus(broadcast.loopEnabled)}</ListItemCard.MetaItem>
            <ListItemCard.MetaItem>{`Preload ${broadcast.preloadCount}`}</ListItemCard.MetaItem>
            <ListItemCard.MetaItem>{formatPublicationStatus(broadcast.isPublished)}</ListItemCard.MetaItem>
          </ListItemCard.Meta>
        </ListItemCard.Content>
        <ListItemCard.Trailing>
          {broadcast.isPublished ? (
            <Button variant="secondary" icon={<Copy />} onClick={createCopyHandler(broadcast)}>
              Copy link
            </Button>
          ) : (
            <Button variant="secondary" icon={<Link2 />} disabled>
              Draft
            </Button>
          )}
        </ListItemCard.Trailing>
      </ListItemCard>
    )
  }

  return (
    <GroupedList>
      <GroupedList.Group>
        <GroupedList.Header>
          <Label.sm>Broadcasts</Label.sm>
        </GroupedList.Header>
        <GroupedList.Content>{broadcasts.map(renderBroadcast)}</GroupedList.Content>
      </GroupedList.Group>
    </GroupedList>
  )
}
