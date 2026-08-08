import type { ZoomMeeting } from "@moc/types/streams/zoom"

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

export function getZoomMeetingCalendarOccurrences(meeting: ZoomMeeting, visibleMonth: Date): Date[] {
  if (!meeting.startTime) return []

  const start = new Date(meeting.startTime)
  if (Number.isNaN(start.getTime())) return []
  if (meeting.recurrenceType === "none") return [start]

  const calendarStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1)
  calendarStart.setDate(1 - calendarStart.getDay())

  const occurrences: Date[] = []
  for (let offset = 0; offset < CALENDAR_DAY_COUNT; offset += 1) {
    const candidate = new Date(calendarStart)
    candidate.setDate(calendarStart.getDate() + offset)
    if (matchesRecurrence(meeting, start, candidate)) occurrences.push(occurrenceOnDate(candidate, start))
  }

  return occurrences
}
