import type { OverviewItemKind } from '@moc/sdk/users'
import type { UpcomingScheduledMessage } from '@moc/sdk/overview'
import type { Stream } from '@moc/types/streams/stream'
import type { ZoomMeeting } from '@moc/types/streams/zoom'
import type { CalendarEvent } from '@moc/ui/components/display/calendar'
import { formatUtcIsoForDateTimeInput, parseDateTimeInputToUtcIso } from '@moc/utils/zoned-date-time'
import { routes } from '@/screens/console-routes'
import { getScheduleEvents } from '../schedule/schedule-events'
import { getScheduleEventItem, type ScheduleAgendaItem, type ScheduleAgendaOptions } from '../schedule/schedule-agenda'
import type { ScheduleData } from '../schedule/schedule-types'
import { getOverviewMeetingOccurrences } from './overview-meeting-occurrences'

export type OverviewAgendaEntry = CalendarEvent & { item: ScheduleAgendaItem; kind: OverviewItemKind; ongoing?: boolean }

export function overviewDateKey(date: Date, timezone: string): string {
  return formatUtcIsoForDateTimeInput(date.toISOString(), timezone).slice(0, 10)
}

function allDayEnd(date: Date, timezone: string): Date {
  const next = new Date(`${overviewDateKey(date, timezone)}T00:00:00Z`)
  next.setUTCDate(next.getUTCDate() + 1)
  return new Date(parseDateTimeInputToUtcIso(`${next.toISOString().slice(0, 10)}T00:00`, timezone))
}

export function getOverviewWorkEntries(work: ScheduleData, options: ScheduleAgendaOptions, timezone: string): OverviewAgendaEntry[] {
  const data = {
    requests: work.requests.filter((request) => request.status !== 'completed'),
    bookings: work.bookings.filter((booking) => booking.status !== 'returned'),
    venueBookings: work.venueBookings,
  }
  return getScheduleEvents(data, timezone).flatMap((event) => {
    const item = getScheduleEventItem(event, options)
    if (!item || !event.data) return []
    return [{ ...event, item, kind: event.data.type, ...(event.allDay ? { endDate: allDayEnd(event.date, timezone) } : {}) }]
  })
}

function createEntry(id: string, title: string, kind: 'stream' | 'meeting' | 'message', date: Date, endDate: Date | undefined, href: string, timezone: string, ongoing = false): OverviewAgendaEntry | null {
  if (!Number.isFinite(date.getTime())) return null
  const formatter = new Intl.DateTimeFormat(undefined, { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  const time = formatter.format(date)
  const timeLabel = ongoing ? 'Live now' : endDate && endDate > date ? `${time} – ${formatter.format(endDate)}` : time
  const detail = kind === 'stream' ? 'YouTube stream' : kind === 'meeting' ? 'Zoom meeting' : 'Scheduled message'
  const color = kind === 'message' ? 'green' : 'purple'
  const item: ScheduleAgendaItem = { id, title, kind, href, timeLabel, detail, color, accessibleLabel: `${title}, ${timeLabel}, ${detail}` }
  return { id, label: title, date, endDate, kind: kind === 'message' ? 'message' : 'stream', item, ongoing }
}

export function getOverviewStreamEntries(streams: Stream[], meetings: ZoomMeeting[], now: Date, timezone: string): OverviewAgendaEntry[] {
  const entries: OverviewAgendaEntry[] = []
  for (const stream of streams) {
    if (stream.streamStatus === 'complete' || stream.actualEndTime) continue
    const ongoing = stream.streamStatus === 'live'
    const start = ongoing ? stream.actualStartTime ?? stream.scheduledStartTime : stream.scheduledStartTime
    if (!start && !ongoing) continue
    const date = start ? new Date(start) : now
    const entry = createEntry(`stream:${stream.id}`, stream.title, 'stream', date, undefined, `/${routes.streams}/stream/${stream.id}`, timezone, ongoing)
    if (entry) entries.push(entry)
  }
  for (const meeting of meetings) {
    for (const occurrence of getOverviewMeetingOccurrences(meeting, now)) {
      const entry = createEntry(`meeting:${meeting.id}:${occurrence.date.toISOString()}`, meeting.topic, 'meeting', occurrence.date, occurrence.endDate, `/${routes.streams}/meeting/${meeting.id}`, timezone)
      if (entry) entries.push(entry)
    }
  }
  return entries
}

export function getOverviewMessageEntries(messages: UpcomingScheduledMessage[], timezone: string): OverviewAgendaEntry[] {
  return messages.flatMap((message) => {
    if (message.status !== 'scheduled' && message.status !== 'sending') return []
    const entry = createEntry(`message:${message.id}`, message.title, 'message', new Date(message.scheduledFor), undefined, `/${routes.scheduledMessages}?occurrence=${encodeURIComponent(message.id)}`, timezone)
    return entry ? [entry] : []
  })
}
