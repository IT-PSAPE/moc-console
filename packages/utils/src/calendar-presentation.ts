import { getCalendarDateRange } from './calendar-date-range'

const fullDateFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' })
const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })
const dateFormatter = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const stampFormatter = new Intl.DateTimeFormat(undefined, { month: 'short' })
const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })

export function formatCalendarDate(date: Date): string { return fullDateFormatter.format(date) }
export function formatCalendarWeekday(date: Date): string { return weekdayFormatter.format(date) }
export function formatCalendarTime(date: Date): string { return timeFormatter.format(date) }

export function getCalendarToolbarLabels(date: Date, view: string): { title: string; range: string | undefined; stamp: string; day: number } {
    const week = getCalendarDateRange(date, 7)
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)
    const title = view === 'day' ? formatCalendarDate(date) : view === 'agenda' ? 'Agenda' : monthFormatter.format(date)
    const range = view === 'week' ? `${dateFormatter.format(week[0])} – ${dateFormatter.format(week[6])}` : view === 'month' ? `${dateFormatter.format(monthStart)} – ${dateFormatter.format(monthEnd)}` : undefined
    return { title, range, stamp: stampFormatter.format(date), day: date.getDate() }
}
