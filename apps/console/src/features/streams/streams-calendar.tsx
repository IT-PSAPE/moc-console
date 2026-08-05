import type { Stream } from "@moc/types/streams/stream"
import type { ZoomMeeting } from "@moc/types/streams/zoom"
import { Calendar, type CalendarEvent } from "@moc/ui/components/display/calendar"
import { ResponsiveDetailAction } from "@/features/responsive-detail-action"
import { routes } from "@/screens/console-routes"
import type { StreamListEntry } from "./stream-list-entry"

type StreamsCalendarProps = {
  events: CalendarEvent<StreamListEntry>[]
  onSelectStream: (stream: Stream) => void
  onSelectMeeting: (meeting: ZoomMeeting) => void
}

export function StreamsCalendar({ events, onSelectStream, onSelectMeeting }: StreamsCalendarProps) {
  function renderEvent(event: CalendarEvent<StreamListEntry>) {
    const entry = event.data
    if (!entry) return null

    if (entry.provider === "youtube") {
      const stream = entry.stream

      function handleStreamActivate() {
        onSelectStream(stream)
      }

      return (
        <ResponsiveDetailAction key={entry.id} mobileHref={`/${routes.streams}/stream/${stream.id}`} onActivate={handleStreamActivate} className="w-full rounded">
          <Calendar.Event color={event.color}>{event.label}</Calendar.Event>
        </ResponsiveDetailAction>
      )
    }

    const meeting = entry.meeting

    function handleMeetingActivate() {
      onSelectMeeting(meeting)
    }

    return (
      <ResponsiveDetailAction key={entry.id} mobileHref={`/${routes.streams}/meeting/${meeting.id}`} onActivate={handleMeetingActivate} className="w-full rounded">
        <Calendar.Event color={event.color}>{event.label}</Calendar.Event>
      </ResponsiveDetailAction>
    )
  }

  return <Calendar events={events} renderEvent={renderEvent} />
}
