import type { ZoomMeeting } from '@moc/types/streams/zoom'
import { formatUtcIsoForDateTimeInput, parseDateTimeInputToUtcIso } from '@moc/utils/zoned-date-time'

export type OverviewMeetingOccurrence = { date: Date; endDate: Date }
const DAY = 86_400_000

function localDay(date: Date, timezone: string): Date {
  return new Date(`${formatUtcIsoForDateTimeInput(date.toISOString(), timezone).slice(0, 10)}T00:00:00Z`)
}

function matchesRecurrence(meeting: ZoomMeeting, day: Date, seed: Date): boolean {
  const interval = Math.max(1, Math.trunc(meeting.recurrenceInterval ?? 1))
  const difference = Math.round((day.getTime() - seed.getTime()) / DAY)
  if (meeting.recurrenceType === 'daily') return difference % interval === 0
  if (meeting.recurrenceType === 'weekly') {
    const weeks = Math.floor((difference + seed.getUTCDay()) / 7)
    const weekdays = meeting.recurrenceDays?.split(',').map(Number) ?? [seed.getUTCDay() + 1]
    return weeks % interval === 0 && weekdays.includes(day.getUTCDay() + 1)
  }
  const months = (day.getUTCFullYear() - seed.getUTCFullYear()) * 12 + day.getUTCMonth() - seed.getUTCMonth()
  const monthDay = Number(meeting.recurrenceDays ?? seed.getUTCDate())
  return months % interval === 0 && day.getUTCDate() === monthDay
}

export function getOverviewMeetingOccurrences(meeting: ZoomMeeting, now: Date, days = 32): OverviewMeetingOccurrence[] {
  if (!meeting.startTime || meeting.meetingType === 'recurring_no_fixed' || meeting.meetingType === 'instant') return []
  const seed = new Date(meeting.startTime)
  if (!Number.isFinite(seed.getTime())) return []
  const duration = Math.max(0, Number.isFinite(meeting.duration) ? meeting.duration : 0) * 60_000
  const seedEnd = new Date(seed.getTime() + duration)
  if (meeting.recurrenceType === 'none' || meeting.meetingType !== 'recurring_fixed') {
    return (duration ? seedEnd > now : seed >= now) ? [{ date: seed, endDate: seedEnd }] : []
  }
  const timezone = meeting.timezone || 'UTC'
  const seedDay = localDay(seed, timezone)
  const today = localDay(now, timezone)
  const endDay = new Date(today.getTime() + Math.max(0, days) * DAY)
  const firstDay = localDay(new Date(now.getTime() - duration), timezone)
  const startTime = formatUtcIsoForDateTimeInput(seed.toISOString(), timezone).slice(11)
  const occurrences: OverviewMeetingOccurrence[] = []
  for (let day = firstDay; day < endDay; day = new Date(day.getTime() + DAY)) {
    if (day < seedDay || !matchesRecurrence(meeting, day, seedDay)) continue
    const date = new Date(parseDateTimeInputToUtcIso(`${day.toISOString().slice(0, 10)}T${startTime}`, timezone))
    const endDate = new Date(date.getTime() + duration)
    if (date >= seed && (duration ? endDate > now : date >= now)) occurrences.push({ date, endDate })
  }
  return occurrences
}
