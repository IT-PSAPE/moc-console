import type { ZoomMeeting } from "@moc/types/streams/zoom"
import { getBrowserTimeZone } from "@moc/utils/browser-date-time"
import { formatUtcIsoForDateTimeInput, parseDateTimeInputToUtcIso } from "@moc/utils/zoned-date-time"

const MILLISECONDS_PER_DAY = 86_400_000
const CALENDAR_DAY_COUNT = 42

function dateOrdinal(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MILLISECONDS_PER_DAY
}

function startOfWeekOrdinal(date: Date): number {
  return dateOrdinal(date) - date.getDay()
}

function positiveInterval(value: number | null): number {
  return value && value > 0 ? value : 1
}

function monthlyDay(meeting: ZoomMeeting, start: Date): number {
  const parsed = Number.parseInt(meeting.recurrenceDays ?? "", 10)
  return parsed >= 1 && parsed <= 31 ? parsed : start.getDate()
}

function weeklyDays(meeting: ZoomMeeting, start: Date): Set<number> {
  const days = (meeting.recurrenceDays ?? "")
    .split(",")
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => value >= 1 && value <= 7)
    .map((value) => value - 1)

  return new Set(days.length > 0 ? days : [start.getDay()])
}

function matchesRecurrence(meeting: ZoomMeeting, start: Date, candidate: Date): boolean {
  const elapsedDays = dateOrdinal(candidate) - dateOrdinal(start)
  if (elapsedDays < 0) return false

  const interval = positiveInterval(meeting.recurrenceInterval)

  if (meeting.recurrenceType === "daily") return elapsedDays % interval === 0

  if (meeting.recurrenceType === "weekly") {
    const elapsedWeeks = (startOfWeekOrdinal(candidate) - startOfWeekOrdinal(start)) / 7
    return elapsedWeeks % interval === 0 && weeklyDays(meeting, start).has(candidate.getDay())
  }

  const elapsedMonths = (candidate.getFullYear() - start.getFullYear()) * 12 + candidate.getMonth() - start.getMonth()
  return elapsedMonths % interval === 0 && candidate.getDate() === monthlyDay(meeting, start)
}

function occurrenceOnDate(date: Date, start: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    start.getHours(),
    start.getMinutes(),
    start.getSeconds(),
    start.getMilliseconds(),
  )
}

function toLocalInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  const seconds = String(date.getSeconds()).padStart(2, "0")
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
}

export function getZoomMeetingCalendarOccurrences(meeting: ZoomMeeting, visibleMonth: Date, displayTimezone = getBrowserTimeZone()): Date[] {
  if (!meeting.startTime) return []

  const startInstant = new Date(meeting.startTime)
  if (Number.isNaN(startInstant.getTime())) return []
  if (meeting.recurrenceType === "none") return [startInstant]
  const start = new Date(formatUtcIsoForDateTimeInput(meeting.startTime, meeting.timezone))

  const visibleStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1)
  visibleStart.setDate(1 - visibleStart.getDay())
  const visibleEnd = new Date(visibleStart)
  visibleEnd.setDate(visibleStart.getDate() + CALENDAR_DAY_COUNT)
  const visibleStartIso = parseDateTimeInputToUtcIso(toLocalInput(visibleStart), displayTimezone)
  const meetingVisibleStart = new Date(formatUtcIsoForDateTimeInput(visibleStartIso, meeting.timezone))
  meetingVisibleStart.setDate(meetingVisibleStart.getDate() - 1)

  const occurrences: Date[] = []
  for (let offset = 0; offset < CALENDAR_DAY_COUNT + 3; offset += 1) {
    const candidate = new Date(meetingVisibleStart)
    candidate.setDate(meetingVisibleStart.getDate() + offset)
    if (matchesRecurrence(meeting, start, candidate)) {
      const localOccurrence = occurrenceOnDate(candidate, start)
      occurrences.push(new Date(parseDateTimeInputToUtcIso(toLocalInput(localOccurrence), meeting.timezone)))
    }
  }

  return occurrences.filter((occurrence) => {
    const displayOccurrence = new Date(formatUtcIsoForDateTimeInput(occurrence.toISOString(), displayTimezone))
    const displayDay = new Date(displayOccurrence.getFullYear(), displayOccurrence.getMonth(), displayOccurrence.getDate())
    return displayDay >= visibleStart && displayDay < visibleEnd
  })
}
