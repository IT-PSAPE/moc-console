import type { OverviewItemKind } from '@moc/sdk/users'
import type { UpcomingScheduledMessage } from '@moc/sdk/overview'
import type { Stream } from '@moc/types/streams/stream'
import type { ZoomMeeting } from '@moc/types/streams/zoom'
import { getBrowserTimeZone } from '@moc/utils/browser-date-time'
import { isCalendarEventPast } from '@moc/utils/calendar-presentation'
import type { ScheduleData } from '../schedule/schedule-types'
import type { ScheduleAgendaGroup, ScheduleAgendaOptions } from '../schedule/schedule-agenda'
import { getOverviewMessageEntries, getOverviewStreamEntries, getOverviewWorkEntries, overviewDateKey } from './overview-agenda-records'

export type OverviewAgendaInput = {
  work: ScheduleData
  streams: Stream[]
  meetings: ZoomMeeting[]
  messages: UpcomingScheduledMessage[]
  kinds: OverviewItemKind[]
  options: ScheduleAgendaOptions
  now: Date
  timezone?: string
}

export function getOverviewAgendaGroups({ work, streams, meetings, messages, kinds, options, now, timezone = getBrowserTimeZone() }: OverviewAgendaInput): ScheduleAgendaGroup[] {
  const today = overviewDateKey(now, timezone)
  const tomorrowDate = new Date(`${today}T00:00:00Z`)
  tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1)
  const tomorrow = tomorrowDate.toISOString().slice(0, 10)
  const formatter = new Intl.DateTimeFormat(undefined, { timeZone: timezone, weekday: 'long', day: 'numeric', month: 'short' })
  const entries = [
    ...getOverviewWorkEntries(work, options, timezone),
    ...getOverviewStreamEntries(streams, meetings, now, timezone),
    ...getOverviewMessageEntries(messages, timezone),
  ].filter((entry) => kinds.includes(entry.kind) && (entry.ongoing || !isCalendarEventPast(entry, now)))
    .sort((left, right) => left.date.getTime() - right.date.getTime())
  const groups = new Map<string, ScheduleAgendaGroup>()
  for (const entry of entries) {
    const key = entry.date < now ? today : overviewDateKey(entry.date, timezone)
    let group = groups.get(key)
    if (!group) {
      const label = key === today ? 'Today' : key === tomorrow ? 'Tomorrow' : formatter.format(entry.date)
      group = { key, label, items: [] }
      groups.set(key, group)
    }
    group.items.push(entry.item)
  }
  return [...groups.values()]
}
