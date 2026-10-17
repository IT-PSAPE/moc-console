import { Badge } from "@moc/ui/components/display/badge"
import { ListItemCard } from "@moc/ui/components/display/list-item-card"
import { streamStatusColor, streamStatusLabel } from "@moc/types/streams/stream-constants"
import type { Stream } from "@moc/types/streams/stream"
import { formatUtcIsoInTimezone } from "@moc/utils/zoned-date-time"
import { Calendar } from "lucide-react"
import { ResponsiveDetailAction } from "@/features/responsive-detail-action"
import { routes } from "@/screens/console-routes"
import { StreamProviderIcon } from "./stream-provider-icon"

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
        <ListItemCard.Leading>
          <StreamProviderIcon provider="youtube" className="size-full object-cover" />
        </ListItemCard.Leading>
        <ListItemCard.Content>
          <ListItemCard.Title>{stream.title}</ListItemCard.Title>
          {stream.description && <ListItemCard.Subtitle>{stream.description}</ListItemCard.Subtitle>}
        </ListItemCard.Content>
        <ListItemCard.Trailing>
          <Badge dot color={streamStatusColor[stream.streamStatus]} label={streamStatusLabel[stream.streamStatus]} />
          <ListItemCard.Meta>
            <ListItemCard.MetaItem icon={<Calendar />}>{formatScheduledTime(stream.scheduledStartTime)}</ListItemCard.MetaItem>
          </ListItemCard.Meta>
        </ListItemCard.Trailing>
      </ListItemCard.Root>
    </ResponsiveDetailAction.Card>
  )
}
