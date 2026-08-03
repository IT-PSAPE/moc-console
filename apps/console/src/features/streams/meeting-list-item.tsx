import { ListItemCard } from "@moc/ui/components/display/list-item-card"
import { zoomRecurrenceLabel } from "@moc/types/streams/zoom-constants"
import type { ZoomMeeting } from "@moc/types/streams/zoom"
import { formatUtcIsoInTimezone } from "@moc/utils/zoned-date-time"
import { Calendar, Clock, Loader, Repeat } from "lucide-react"
import { ResponsiveDetailAction } from "@/features/responsive-detail-action"
import { routes } from "@/screens/console-routes"
import { StreamProviderIcon } from "./stream-provider-icon"

type MeetingListItemProps = {
  meeting: ZoomMeeting
  onSelect: (meeting: ZoomMeeting) => void
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function MeetingListItem({ meeting, onSelect }: MeetingListItemProps) {
  const isRecurring = meeting.recurrenceType !== "none"
  const isPast = meeting.startTime ? new Date(meeting.startTime) < new Date() : false

  function handleActivate() {
    onSelect(meeting)
  }

  return (
    <ResponsiveDetailAction.Card
      mobileHref={`/${routes.streams}/meeting/${meeting.id}`}
      onActivate={handleActivate}
    >
      <ListItemCard.Root>
        <ListItemCard.Leading>
          <StreamProviderIcon provider="zoom" className="size-5" />
        </ListItemCard.Leading>
        <ListItemCard.Content>
          <ListItemCard.Title>{meeting.topic}</ListItemCard.Title>
          {meeting.description && <ListItemCard.Subtitle>{meeting.description}</ListItemCard.Subtitle>}
          <ListItemCard.Meta>
            <ListItemCard.MetaItem icon={<Loader />}>{isPast ? "Past" : "Upcoming"}</ListItemCard.MetaItem>
            <ListItemCard.MetaItem icon={<Calendar />}>{formatUtcIsoInTimezone(meeting.startTime, meeting.timezone)}</ListItemCard.MetaItem>
            <ListItemCard.MetaItem icon={<Clock />}>{formatDuration(meeting.duration)}</ListItemCard.MetaItem>
            {isRecurring && <ListItemCard.MetaItem icon={<Repeat />}>{zoomRecurrenceLabel[meeting.recurrenceType]}</ListItemCard.MetaItem>}
          </ListItemCard.Meta>
        </ListItemCard.Content>
      </ListItemCard.Root>
    </ResponsiveDetailAction.Card>
  )
}
