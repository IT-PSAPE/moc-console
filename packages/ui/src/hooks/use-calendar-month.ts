import { useMemo, useState } from 'react'
import { getCalendarDayEvents, getCalendarMonthDays } from '@moc/utils/calendar-date-range'
import type { CalendarEvent } from '../components/display/calendar-types'

export function useCalendarMonth<T>(date: Date, events: CalendarEvent<T>[], onDateSelect?: (date: Date) => void) {
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [previewOpen, setPreviewOpen] = useState(false)
    const days = useMemo(() => getCalendarMonthDays(date), [date])
    const selectedEvents = useMemo(() => selectedDate ? getCalendarDayEvents(events, selectedDate) : [], [events, selectedDate])
    function selectDate(nextDate: Date) {
        setSelectedDate(nextDate)
        setPreviewOpen(true)
        onDateSelect?.(nextDate)
    }
    return { state: { days, selectedDate, selectedEvents, previewOpen }, actions: { selectDate, setPreviewOpen } }
}
