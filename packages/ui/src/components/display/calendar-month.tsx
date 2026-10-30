import { formatCalendarDate, prioritizeCalendarEvents } from '@moc/utils/calendar-presentation'
import { getCalendarDateKey, getCalendarDayEvents } from '@moc/utils/calendar-date-range'
import { cn } from '@moc/utils/cn'
import { useCalendarMonth } from '../../hooks/use-calendar-month'
import { useIsLandscape } from '../../hooks/use-is-landscape'
import { Drawer } from '../overlays/drawer'
import { Button } from '../controls/button'
import { X } from 'lucide-react'
import { CalendarCell } from './calendar-cell'
import { CalendarEventContent } from './calendar-event'
import type { CalendarEvent, CalendarRenderDayProps, CalendarRenderEvent } from './calendar-types'

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export type CalendarMonthProps<T = unknown> = { date: Date; events?: CalendarEvent<T>[]; renderDay?: (props: CalendarRenderDayProps<T>) => React.ReactNode; renderEvent?: CalendarRenderEvent<T>; renderPreviewEvent?: CalendarRenderEvent<T>; onDateSelect?: (date: Date) => void; className?: string }

export function CalendarMonth<T = unknown>({ date, events = [], renderDay, renderEvent, renderPreviewEvent, onDateSelect, className }: CalendarMonthProps<T>) {
    const { state, actions } = useCalendarMonth(date, events, onDateSelect)
    const isLandscape = useIsLandscape()
    const today = getCalendarDateKey(state.now)
    function renderWeekday(day: string) {
        return <div key={day} className="flex min-h-8 min-w-0 items-center justify-center border-r border-b border-secondary px-2 py-1 label-xs text-tertiary">{day}</div>
    }
    function renderDate(day: Date) {
        const key = getCalendarDateKey(day)
        const dayEvents = prioritizeCalendarEvents(getCalendarDayEvents(events, day), state.now)
        const isCurrentMonth = day.getMonth() === date.getMonth()
        const isToday = key === today
        if (renderDay) return <div key={key} className="min-w-0 border-r border-b border-secondary">{renderDay({ date: day, isCurrentMonth, isToday, events: dayEvents })}</div>
        return <CalendarCell key={key} date={day} events={dayEvents} now={state.now} isCurrentMonth={isCurrentMonth} isToday={isToday} isLandscape={isLandscape} isSelected={state.previewOpen && state.selectedDate !== null && key === getCalendarDateKey(state.selectedDate)} onSelect={actions.selectDate} renderEvent={renderEvent} />
    }
    function renderPreviewItem(event: CalendarEvent<T>, index: number) {
        const render = renderPreviewEvent ?? renderEvent
        return <div key={event.id ?? index} className="min-w-0">{render ? render(event, index) : <CalendarEventContent color={event.color}>{event.label}</CalendarEventContent>}</div>
    }
    const selectedLabel = state.selectedDate ? formatCalendarDate(state.selectedDate) : ''
    return <>
        <div role="group" aria-label="Month calendar" className={cn('min-w-0 overflow-x-hidden overflow-y-auto [&>div]:-mr-px [&>div:last-child]:-mb-px', className)}>
            <div className="sticky top-0 z-10 grid shrink-0 grid-cols-7 bg-primary">{weekdays.map(renderWeekday)}</div>
            <div data-calendar-month-days="" className="grid grid-cols-7 auto-rows-[minmax(min-content,1fr)]">{state.days.map(renderDate)}</div>
        </div>
        {!renderDay && <Drawer open={state.previewOpen} onOpenChange={actions.setPreviewOpen} mobileSide="bottom"><Drawer.Portal><Drawer.Backdrop /><Drawer.Panel aria-label={`Items on ${selectedLabel}`}><Drawer.Header><h2 className="min-w-0 flex-1 label-md">{selectedLabel}</h2><Drawer.Close><Button.Icon variant="ghost" aria-label="Close day preview" icon={<X />} /></Drawer.Close></Drawer.Header><Drawer.Content className="gap-1 p-3">{state.selectedEvents.length ? state.selectedEvents.map(renderPreviewItem) : <p className="paragraph-sm text-tertiary">No items scheduled for this day.</p>}</Drawer.Content></Drawer.Panel></Drawer.Portal></Drawer>}
    </>
}
