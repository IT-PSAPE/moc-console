import { cn } from "@/utils/cn"
import { Badge } from "@/components/display/badge"
import { Label, Paragraph } from "@/components/display/text"
import { streamStatusColor, streamStatusLabel } from "@/types/broadcast/stream-constants"
import type { Stream } from "@/types/broadcast/stream"
import { formatUtcIsoInTimezone } from "@/utils/zoned-date-time"
import { Calendar, CheckCircle, Radio } from "lucide-react"

type StreamListItemProps = {
  stream: Stream
  onClick: () => void
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

export function StreamListItem({ stream, onClick }: StreamListItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 bg-primary cursor-pointer transition-colors border rounded-md border-secondary",
      )}
      onClick={onClick}
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
    </div>
  )
}
