import { getCalendarDateRange, type CalendarEventLike } from './calendar-date-range'

const fullDateFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' })
const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })
const dateFormatter = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const stampFormatter = new Intl.DateTimeFormat(undefined, { month: 'short' })
const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })

export function formatCalendarDate(date: Date): string { return fullDateFormatter.format(date) }
export function formatCalendarWeekday(date: Date): string { return weekdayFormatter.format(date) }
export function formatCalendarTime(date: Date): string { return timeFormatter.format(date) }

export function isCalendarEventPast(event: CalendarEventLike, now: Date): boolean {
    const start = event.date.getTime()
    if (!Number.isFinite(start)) return false
    const end = event.endDate?.getTime()
    if (Number.isFinite(end) && end! > start) return end! <= now.getTime()
    if (event.allDay) return new Date(event.date.getFullYear(), event.date.getMonth(), event.date.getDate() + 1).getTime() <= now.getTime()
    return start < now.getTime()
}

export function prioritizeCalendarEvents<T extends CalendarEventLike>(events: T[], now: Date): T[] {
    function compareEvents(left: T, right: T): number {
        const priority = Number(isCalendarEventPast(left, now)) - Number(isCalendarEventPast(right, now))
        return priority || left.date.getTime() - right.date.getTime()
    }
    return [...events].sort(compareEvents)
}

export function getCalendarCurrentTimeScrollTop(now: Date, viewportHeight: number, headerHeight: number, scrollHeight: number): number {
    const currentMinute = now.getHours() * 60 + now.getMinutes()
    const availableHeight = Math.max(0, viewportHeight - headerHeight)
    const target = currentMinute * 128 / 60 - availableHeight / 3
    return Math.max(0, Math.min(target, scrollHeight - viewportHeight))
}

export function getCalendarToolbarLabels(date: Date, view: string): { title: string; range: string | undefined; stamp: string; day: number } {
    const week = getCalendarDateRange(date, 7)
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)
    const title = view === 'day' ? formatCalendarDate(date) : view === 'agenda' ? 'Agenda' : monthFormatter.format(date)
    const range = view === 'week' ? `${dateFormatter.format(week[0])} – ${dateFormatter.format(week[6])}` : view === 'month' ? `${dateFormatter.format(monthStart)} – ${dateFormatter.format(monthEnd)}` : undefined
    return { title, range, stamp: stampFormatter.format(date), day: date.getDate() }
}
