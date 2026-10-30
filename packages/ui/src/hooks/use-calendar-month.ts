import { useMemo, useState } from 'react'
import { getCalendarDayEvents, getCalendarMonthDays } from '@moc/utils/calendar-date-range'
import { prioritizeCalendarEvents } from '@moc/utils/calendar-presentation'
import type { CalendarEvent } from '../components/display/calendar-types'
import { useCurrentTime } from './use-current-time'

export function useCalendarMonth<T>(date: Date, events: CalendarEvent<T>[], onDateSelect?: (date: Date) => void) {
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [previewOpen, setPreviewOpen] = useState(false)
    const now = useCurrentTime()
    const days = useMemo(() => getCalendarMonthDays(date), [date])
    const selectedEvents = useMemo(() => selectedDate ? prioritizeCalendarEvents(getCalendarDayEvents(events, selectedDate), now) : [], [events, selectedDate, now])
    function selectDate(nextDate: Date) {
        setSelectedDate(nextDate)
        setPreviewOpen(true)
        onDateSelect?.(nextDate)
    }
    return { state: { days, selectedDate, selectedEvents, previewOpen, now }, actions: { selectDate, setPreviewOpen } }
}
