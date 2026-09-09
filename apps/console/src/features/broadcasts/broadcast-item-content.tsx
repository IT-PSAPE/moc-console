import type { Broadcast } from "@moc/types/broadcast/broadcast"
import { BROADCAST_KIND_LABELS } from "@moc/types/broadcast/broadcast-constants"
import { ListItemCard } from "@moc/ui/components/display/list-item-card"
import { formatUtcIsoInBrowserTimeZone } from "@moc/utils/browser-date-time"
import { Clock, ListMusic, ListVideo, Music4 } from "lucide-react"

function formatItemCount(count: number): string {
  return `${count} ${count === 1 ? "item" : "items"}`
}

export function BroadcastItemContent({ broadcast }: { broadcast: Broadcast }) {
  return (
    <ListItemCard.Root>
      <ListItemCard.Leading>{broadcast.kind === "audio" ? <Music4 /> : <ListVideo />}</ListItemCard.Leading>
      <ListItemCard.Content>
        <ListItemCard.Title>{broadcast.title}</ListItemCard.Title>
        {broadcast.description ? <ListItemCard.Subtitle>{broadcast.description}</ListItemCard.Subtitle> : null}
        <ListItemCard.Meta>
          <ListItemCard.MetaItem icon={<ListMusic />}>{`${BROADCAST_KIND_LABELS[broadcast.kind]} · ${formatItemCount(broadcast.items.length)}`}</ListItemCard.MetaItem>
          <ListItemCard.MetaItem icon={<Clock />}>{formatUtcIsoInBrowserTimeZone(broadcast.updatedAt, { dateStyle: "medium", timeStyle: "short" })}</ListItemCard.MetaItem>
        </ListItemCard.Meta>
      </ListItemCard.Content>
    </ListItemCard.Root>
  )
}
