import { cn } from "@moc/utils/cn"
import { Badge } from "@moc/ui/components/display/badge"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import { zoomRecurrenceLabel } from "@moc/types/broadcast/zoom-constants"
import type { ZoomMeeting } from "@moc/types/broadcast/zoom"
import { formatUtcIsoInTimezone } from "@moc/utils/zoned-date-time"
import { Calendar, Repeat } from "lucide-react"

type MeetingListItemProps = {
  meeting: ZoomMeeting
  onClick: () => void
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function MeetingListItem({ meeting, onClick }: MeetingListItemProps) {
  const isRecurring = meeting.recurrenceType !== "none"
  const isPast = meeting.startTime ? new Date(meeting.startTime) < new Date() : false

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 bg-primary cursor-pointer transition-colors border rounded-md border-secondary",
      )}
      onClick={onClick}
    >
      <div className="size-10 shrink-0 rounded-md bg-secondary flex items-center justify-center">
        {isRecurring
          ? <Repeat className="size-5 text-utility-blue-700" />
          : <Calendar className="size-5 text-tertiary" />}
      </div>

      <div className="flex-1 min-w-0">
        <Label.sm className="truncate block">{meeting.topic}</Label.sm>
        <Paragraph.xs className="text-tertiary">
          {formatUtcIsoInTimezone(meeting.startTime, meeting.timezone)} &middot; {formatDuration(meeting.duration)}
        </Paragraph.xs>
      </div>

      <div className="flex items-center gap-1.5">
        {isRecurring && (
          <Badge label={zoomRecurrenceLabel[meeting.recurrenceType]} color="blue" />
        )}
        <Badge label={isPast ? "Past" : "Upcoming"} color={isPast ? "gray" : "green"} />
      </div>
    </div>
  )
}
