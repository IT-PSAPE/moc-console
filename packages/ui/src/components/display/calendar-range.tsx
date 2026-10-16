import { formatCalendarTime } from '@moc/utils/calendar-presentation'
import { cn } from '@moc/utils/cn'
import type { ReactNode } from 'react'
import { useCalendarRange } from '../../hooks/use-calendar-range'
import { CalendarEventContent } from './calendar-event'
import type { CalendarEvent, CalendarRenderEvent } from './calendar-types'

export type CalendarRangeProps<T = unknown> = { date: Date; events?: CalendarEvent<T>[]; renderEvent?: CalendarRenderEvent<T> }
const timeSlots = Array.from({ length: 48 }, (_, slot) => {
    const hour = Math.floor(slot / 2)
    return { minute: slot * 30, label: slot % 2 === 0 ? `${hour % 12 || 12}${hour < 12 ? 'am' : 'pm'}` : null }
})

export function CalendarRange<T = unknown>({ date, events = [], days, renderEvent }: CalendarRangeProps<T> & { days: number }) {
    const { state, meta: { viewportRef } } = useCalendarRange(date, events, days)
    const gridClass = days === 7 ? 'grid-cols-[4rem_repeat(7,minmax(0,1fr))]' : 'grid-cols-[4rem_minmax(0,1fr)]'
    function renderItem(event: CalendarEvent<T>, index: number): ReactNode {
        return renderEvent ? renderEvent(event, index) : <CalendarEventContent color={event.color} title={event.label} time={event.allDay ? undefined : formatCalendarTime(event.date)}>{event.label}</CalendarEventContent>
    }
    function renderDayHeader(day: (typeof state.dates)[number]) {
        const isToday = day.key === state.todayKey
        return <div key={day.key} className="flex min-w-0 items-center justify-center gap-2 border-l border-secondary px-2 py-1" aria-label={day.fullLabel}><span className="label-xs text-tertiary">{day.weekday}</span><span className={cn('flex size-6 shrink-0 items-center justify-center rounded-full label-xs', isToday ? 'bg-brand_solid text-on-brand' : 'text-secondary')}>{day.date.getDate()}</span></div>
    }
    function renderAllDay(day: (typeof state.dates)[number]) {
        function renderAllDayEvent(event: CalendarEvent<T>, index: number) {
            return <div key={event.id ?? index} className="min-w-0">{renderItem(event, index)}</div>
        }
        return <div key={day.key} aria-label={`All-day items on ${day.fullLabel}`} className="flex min-h-8 min-w-0 flex-col gap-1 border-l border-secondary p-1">{day.allDayEvents.map(renderAllDayEvent)}</div>
    }
    function renderTimeLabel(slot: (typeof timeSlots)[number]) {
        return <div key={slot.minute} className="relative h-8">{slot.label && <span className="absolute right-2 top-1 text-[11px] text-tertiary">{slot.label}</span>}</div>
    }
    function renderTimeLine(slot: (typeof timeSlots)[number]) {
        return <div key={slot.minute} data-calendar-time-slot={slot.minute} className={cn('h-8 border-t', slot.label ? 'border-secondary' : 'border-secondary/50')} />
    }
    function renderDay(day: (typeof state.dates)[number]) {
        function renderTimedItem(entry: (typeof day.timedEvents)[number], index: number) {
            const { event, startMinute, endMinute, column, columns } = entry
            const style = { top: startMinute * 64 / 60, height: Math.max(24, (endMinute - startMinute) * 64 / 60 - 2), left: `calc(${column / columns * 100}% + 3px)`, width: `calc(${100 / columns}% - 6px)` }
            return <div key={event.id ?? index} className="absolute min-w-0 overflow-hidden [&_[data-calendar-event]]:flex-col [&_[data-calendar-event]]:gap-0.5 [&_[data-calendar-event]>span:first-child]:flex-none [&_[data-calendar-event]>span:first-child]:line-clamp-2 [&_[data-calendar-event]>span:first-child]:whitespace-normal [&[data-compact]_[data-calendar-event]>span:first-child]:line-clamp-1 [&[data-compact]_[data-calendar-event]>span:last-child:not(:first-child)]:hidden" style={style} data-calendar-timed-item="" data-compact={endMinute - startMinute < 45 || undefined} title={`${event.label}, ${formatCalendarTime(event.date)}`} aria-label={`${event.label}, ${formatCalendarTime(event.date)}`}>{renderItem(event, index)}</div>
        }
        return <section key={day.key} aria-label={`Hourly items on ${day.fullLabel}`} className="relative h-[1536px] min-w-0 overflow-hidden border-l border-secondary">
            <div aria-hidden="true">{timeSlots.map(renderTimeLine)}</div>
            {day.timedEvents.map(renderTimedItem)}
            {day.key === state.todayKey && <div aria-label="Current time today" className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-brand" style={{ top: state.currentMinute * 64 / 60 }}><span className="absolute -left-1 -top-1 size-1.5 rounded-full bg-brand_solid" /></div>}
        </section>
    }
    return <div data-calendar-range-root="" role="group" aria-label={days === 7 ? 'Week calendar' : 'Day calendar'} className="min-w-0 overflow-x-auto overscroll-x-contain">
        <div data-calendar-range-content="" className={cn('min-w-0', days === 7 && 'min-w-[700px]')}>
            <div data-calendar-range-viewport="" ref={viewportRef} tabIndex={0} aria-label="Calendar hours, scroll to explore the day" className="max-h-[min(75dvh,50rem)] overflow-y-auto overscroll-y-contain focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-border-brand">
                <div className="sticky top-0 z-20 bg-primary">
                    {days > 1 && <div className={cn('grid border-b border-secondary', gridClass)}><div aria-hidden="true" />{state.dates.map(renderDayHeader)}</div>}
                    <div className={cn('grid border-b border-secondary', gridClass)}><span className="flex min-h-8 items-center justify-end px-2 py-1 text-[11px] text-tertiary">All day</span>{state.dates.map(renderAllDay)}</div>
                </div>
                <div className={cn('relative grid', gridClass)}><div aria-hidden="true" className="h-[1536px]">{timeSlots.map(renderTimeLabel)}</div>{state.dates.map(renderDay)}<div aria-label="Current time" className="pointer-events-none absolute right-0 left-16 z-10 border-t border-brand/40" style={{ top: state.currentMinute * 64 / 60 }} /></div>
            </div>
        </div>
    </div>
}
