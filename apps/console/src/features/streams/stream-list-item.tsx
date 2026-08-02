import { ListItemCard } from "@moc/ui/components/display/list-item-card"
import { streamStatusLabel } from "@moc/types/streams/stream-constants"
import type { Stream } from "@moc/types/streams/stream"
import { formatUtcIsoInTimezone } from "@moc/utils/zoned-date-time"
import { Calendar, Loader } from "lucide-react"
import { ResponsiveDetailAction } from "@/features/responsive-detail-action"
import { routes } from "@/screens/console-routes"

type StreamListItemProps = {
  stream: Stream
  onSelect: (stream: Stream) => void
}

function formatScheduledTime(iso: string | null): string {
  if (!iso) return "No schedule"
  return formatUtcIsoInTimezone(iso, Intl.DateTimeFormat().resolvedOptions().timeZone)
}

export function StreamListItem({ stream, onSelect }: StreamListItemProps) {
  function handleActivate() {
    onSelect(stream)
  }

  return (
    <ResponsiveDetailAction.Card
      mobileHref={`/${routes.streams}/stream/${stream.id}`}
      onActivate={handleActivate}
    >
      <ListItemCard.Root>
        <ListItemCard.Content>
          <ListItemCard.Title>{stream.title}</ListItemCard.Title>
          {stream.description && <ListItemCard.Subtitle>{stream.description}</ListItemCard.Subtitle>}
          <ListItemCard.Meta>
            <ListItemCard.MetaItem icon={<Loader />}>{streamStatusLabel[stream.streamStatus]}</ListItemCard.MetaItem>
            <ListItemCard.MetaItem icon={<Calendar />}>{formatScheduledTime(stream.scheduledStartTime)}</ListItemCard.MetaItem>
          </ListItemCard.Meta>
        </ListItemCard.Content>
      </ListItemCard.Root>
    </ResponsiveDetailAction.Card>
  )
}
