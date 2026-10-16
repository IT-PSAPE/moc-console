import { useState } from 'react'

export function useCalendarNavigation(defaultMonth: Date | undefined, onMonthChange?: (date: Date) => void) {
    const [date, setDate] = useState(() => defaultMonth ?? new Date())
    function navigate(offset: number) {
        const next = new Date(date.getFullYear(), date.getMonth() + offset, 1)
        setDate(next)
        onMonthChange?.(next)
    }
    function previous() { navigate(-1) }
    function next() { navigate(1) }
    function today() {
        const nextDate = new Date()
        setDate(nextDate)
        onMonthChange?.(nextDate)
    }
    function selectDate(nextDate: Date) {
        if (date.getMonth() === nextDate.getMonth() && date.getFullYear() === nextDate.getFullYear()) return
        setDate(nextDate)
        onMonthChange?.(nextDate)
    }
    return { state: { date }, actions: { previous, next, today, selectDate } }
}
