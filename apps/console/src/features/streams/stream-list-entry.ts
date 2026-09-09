import type { Stream } from "@moc/types/streams/stream"
import { streamStatusColor } from "@moc/types/streams/stream-constants"
import type { ZoomMeeting } from "@moc/types/streams/zoom"
import type { CalendarEvent } from "@moc/ui/components/display/calendar"
import { getZoomMeetingCalendarOccurrences } from "./zoom-meeting-calendar-occurrences"

export type StreamListEntry =
  | { id: string; provider: "youtube"; scheduledAt: string | null; stream: Stream }
  | { id: string; provider: "zoom"; scheduledAt: string | null; meeting: ZoomMeeting }

export function createStreamListEntries(streams: Stream[], meetings: ZoomMeeting[]): StreamListEntry[] {
  const entries: StreamListEntry[] = [
    ...streams.map((stream) => ({ id: `youtube-${stream.id}`, provider: "youtube" as const, scheduledAt: stream.scheduledStartTime, stream })),
    ...meetings.map((meeting) => ({ id: `zoom-${meeting.id}`, provider: "zoom" as const, scheduledAt: meeting.startTime, meeting })),
  ]

  return entries.sort((a, b) => {
    const parsedA = a.scheduledAt ? Date.parse(a.scheduledAt) : Number.NaN
    const parsedB = b.scheduledAt ? Date.parse(b.scheduledAt) : Number.NaN
    const aTime = Number.isNaN(parsedA) ? Number.POSITIVE_INFINITY : parsedA
    const bTime = Number.isNaN(parsedB) ? Number.POSITIVE_INFINITY : parsedB
    return aTime - bTime
  })
}

export function createStreamCalendarEvents(entries: StreamListEntry[], visibleMonth: Date): CalendarEvent<StreamListEntry>[] {
  const events: CalendarEvent<StreamListEntry>[] = []

  for (const entry of entries) {
    if (!entry.scheduledAt) continue

    if (entry.provider === "youtube") {
      const date = new Date(entry.scheduledAt)
      if (Number.isNaN(date.getTime())) continue
      events.push({ id: entry.id, date, label: entry.stream.title, color: streamStatusColor[entry.stream.streamStatus], data: entry })
    } else {
      const occurrences = getZoomMeetingCalendarOccurrences(entry.meeting, visibleMonth)
      for (const date of occurrences) {
        events.push({ id: `${entry.id}-${date.toISOString()}`, date, label: entry.meeting.topic, color: "blue", data: entry })
      }
    }
  }

  return events.sort((a, b) => a.date.getTime() - b.date.getTime())
}
