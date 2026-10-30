import { formatCalendarDate, formatCalendarWeekday, getCalendarCurrentTimeScrollTop, isCalendarEventPast } from '@moc/utils/calendar-presentation'
import { useEffect, useMemo, useRef } from 'react'
import { getCalendarDateKey, getCalendarDateRange, getCalendarDayEvents } from '@moc/utils/calendar-date-range'
import { getCalendarTimedLayout } from '@moc/utils/calendar-time-layout'
import type { CalendarEvent } from '../components/display/calendar-types'
import { useCurrentTime } from './use-current-time'


export function useCalendarRange<T>(date: Date, events: CalendarEvent<T>[], days: number, currentTimeScrollRequest = 0) {
    const viewportRef = useRef<HTMLDivElement>(null)
    const initialScrollSet = useRef(false)
    const now = useCurrentTime()
    const todayKey = getCalendarDateKey(now)
    const rangeStartKey = getCalendarDateKey(getCalendarDateRange(date, days)[0])
    const dates = useMemo(() => getCalendarDateRange(date, days).map(day => {
        const dayEvents = getCalendarDayEvents(events, day)
        return { date: day, key: getCalendarDateKey(day), weekday: formatCalendarWeekday(day), fullLabel: formatCalendarDate(day), allDayEvents: dayEvents.filter(event => event.allDay).map(event => ({ event, isPast: isCalendarEventPast(event, now) })), timedEvents: getCalendarTimedLayout(events, day).map(entry => ({ ...entry, isPast: isCalendarEventPast(entry.event, now) })) }
    }), [date, days, events, now])
    const hasToday = dates.some(day => day.key === todayKey)
    useEffect(() => {
        const viewport = viewportRef.current
        if (!viewport) return
        if (hasToday) {
            const headerHeight = viewport.querySelector<HTMLElement>('[data-calendar-range-header]')?.offsetHeight ?? 0
            viewport.scrollTop = getCalendarCurrentTimeScrollTop(new Date(), viewport.clientHeight, headerHeight, viewport.scrollHeight)
        } else if (!initialScrollSet.current) {
            viewport.scrollTop = 7 * 128
        }
        initialScrollSet.current = true
        // Data refreshes and clock ticks preserve manual scroll; navigation and Today restore it.
    }, [rangeStartKey, todayKey, hasToday, days, currentTimeScrollRequest])
    return { state: { dates, todayKey, hasToday, currentMinute: now.getHours() * 60 + now.getMinutes() }, meta: { viewportRef } }
}
