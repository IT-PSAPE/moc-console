import { cn } from '@moc/utils/cn'
import type { HTMLAttributes } from 'react'
import { useCalendarNavigation } from '../../hooks/use-calendar-navigation'
import { CalendarMonth, type CalendarMonthProps } from './calendar-month'
import { CalendarToolbar } from './calendar-toolbar'
import { CalendarCell } from './calendar-cell'
import { CalendarEventContent } from './calendar-event'
import { CalendarDay } from './calendar-day'
import { CalendarWeek } from './calendar-week'
export type { CalendarEvent } from './calendar-types'

type CalendarRootProps<T = unknown> = HTMLAttributes<HTMLDivElement> & Omit<CalendarMonthProps<T>, 'date' | 'onDateSelect'> & { defaultMonth?: Date; onMonthChange?: (date: Date) => void }

function CalendarContainer({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('min-w-0 overflow-hidden rounded-xl border border-secondary bg-primary shadow-xs', className)} {...props} />
}

function CalendarRoot<T = unknown>({ className, defaultMonth, events, onMonthChange, renderDay, renderEvent, renderPreviewEvent, ...props }: CalendarRootProps<T>) {
    const { state, actions } = useCalendarNavigation(defaultMonth, onMonthChange)
    return <CalendarContainer className={className} {...props}>
        <CalendarToolbar date={state.date} view="month" onPrevious={actions.previous} onNext={actions.next} onToday={actions.today} />
        <CalendarMonth onDateSelect={actions.selectDate} date={state.date} events={events} renderDay={renderDay} renderEvent={renderEvent} renderPreviewEvent={renderPreviewEvent} />
    </CalendarContainer>
}

export const Calendar = Object.assign(CalendarRoot, {
    Container: CalendarContainer,
    Toolbar: CalendarToolbar,
    Month: CalendarMonth,
    Cell: CalendarCell,
    Day: CalendarDay,
    Event: CalendarEventContent,
    Week: CalendarWeek,
})
