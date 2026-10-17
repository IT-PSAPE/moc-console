import { formatCalendarDate, formatCalendarWeekday } from '@moc/utils/calendar-presentation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getCalendarDateKey, getCalendarDateRange, getCalendarDayEvents } from '@moc/utils/calendar-date-range'
import { getCalendarTimedLayout } from '@moc/utils/calendar-time-layout'
import type { CalendarEvent } from '../components/display/calendar-types'


export function useCalendarRange<T>(date: Date, events: CalendarEvent<T>[], days: number) {
    const viewportRef = useRef<HTMLDivElement>(null)
    const [now, setNow] = useState(() => new Date())
    useEffect(() => {
        const interval = window.setInterval(() => setNow(new Date()), 60000)
        return () => window.clearInterval(interval)
    }, [])
    const dates = useMemo(() => getCalendarDateRange(date, days).map(day => {
        const dayEvents = getCalendarDayEvents(events, day)
        return { date: day, key: getCalendarDateKey(day), weekday: formatCalendarWeekday(day), fullLabel: formatCalendarDate(day), allDayEvents: dayEvents.filter(event => event.allDay), timedEvents: getCalendarTimedLayout(events, day) }
    }), [date, days, events])
    useEffect(() => {
        // Set the initial position once; date navigation and data updates keep the user's scroll.
        if (viewportRef.current) viewportRef.current.scrollTop = 7 * 128
    }, [])
    return { state: { dates, todayKey: getCalendarDateKey(now), currentMinute: now.getHours() * 60 + now.getMinutes() }, meta: { viewportRef } }
}
