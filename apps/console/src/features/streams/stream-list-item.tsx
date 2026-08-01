import { Badge } from "@moc/ui/components/display/badge"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import { streamStatusColor, streamStatusLabel } from "@moc/types/streams/stream-constants"
import type { Stream } from "@moc/types/streams/stream"
import { formatUtcIsoInTimezone } from "@moc/utils/zoned-date-time"
import { Calendar, CheckCircle, Radio } from "lucide-react"
import { ResponsiveDetailAction } from "@/features/responsive-detail-action"
import { routes } from "@/screens/console-routes"

type StreamListItemProps = {
  stream: Stream
  onSelect: (stream: Stream) => void
}

function getStreamIcon(status: Stream["streamStatus"]) {
  switch (status) {
    case "live":
      return <Radio className="size-5 text-utility-red-700" />
    case "complete":
      return <CheckCircle className="size-5 text-utility-green-700" />
    default:
      return <Calendar className="size-5 text-tertiary" />
  }
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
      className="flex items-center gap-3 px-3 py-2.5"
    >
      {/* Icon */}
      <div className="size-10 shrink-0 rounded-md bg-secondary flex items-center justify-center">
        {getStreamIcon(stream.streamStatus)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <Label.sm className="truncate block">{stream.title}</Label.sm>
        <Paragraph.xs className="text-tertiary">
          {formatScheduledTime(stream.scheduledStartTime)}
        </Paragraph.xs>
      </div>

      {/* Status badge */}
      <Badge
        label={streamStatusLabel[stream.streamStatus]}
        color={streamStatusColor[stream.streamStatus]}
      />
    </ResponsiveDetailAction.Card>
  )
}
