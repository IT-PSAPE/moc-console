import { formatCalendarDate } from '@moc/utils/calendar-presentation'
import { cn } from '@moc/utils/cn'
import { InteractiveSurface } from '../controls/interactive-surface'
import { CalendarEventContent } from './calendar-event'
import type { CalendarEvent, CalendarRenderEvent } from './calendar-types'

const eventDotColorMap: Record<NonNullable<CalendarEvent['color']>, string> = {
    red: 'bg-error_solid', orange: 'bg-text-warning', yellow: 'bg-utility-yellow-700', green: 'bg-text-success', blue: 'bg-utility-blue-700', purple: 'bg-utility-purple-700', gray: 'bg-text-quaternary',
}
export type CalendarCellProps<T = unknown> = {
    date: Date
    events: CalendarEvent<T>[]
    isCurrentMonth: boolean
    isLandscape?: boolean
    isSelected?: boolean
    isToday: boolean
    onSelect?: (date: Date) => void
    renderEvent?: CalendarRenderEvent<T>
}

export function CalendarCell<T = unknown>({ date, events, isCurrentMonth, isLandscape = false, isSelected = false, isToday, onSelect, renderEvent }: CalendarCellProps<T>) {
    function selectDate() { onSelect?.(date) }
    function renderItem(event: CalendarEvent<T>, index: number) {
        return <div key={event.id ?? index} className="min-w-0">{renderEvent ? renderEvent(event, index) : <CalendarEventContent color={event.color} title={event.label}>{event.label}</CalendarEventContent>}</div>
    }
    function renderDot(event: CalendarEvent<T>, index: number) {
        return <span key={event.id ?? index} className={cn('size-1 shrink-0 rounded-full', eventDotColorMap[event.color ?? 'gray'])} />
    }
    const dayLabel = `${formatCalendarDate(date)}, ${events.length} item${events.length === 1 ? '' : 's'}`
    const dateClass = cn('inline-flex size-6 shrink-0 items-center justify-center rounded-full paragraph-xs', isToday ? 'bg-brand_solid text-on-brand' : isCurrentMonth ? 'text-secondary' : 'text-quaternary')
    if (isLandscape) return <InteractiveSurface aria-label={dayLabel} aria-haspopup="dialog" aria-pressed={isSelected} onClick={selectDate} className={cn('flex min-h-20 min-w-0 flex-col items-center gap-1 border-r border-b border-secondary px-0.5 py-2', !isCurrentMonth && 'bg-secondary', isSelected && 'bg-brand')}>
        <span className={dateClass}>{date.getDate()}</span><span className="flex flex-wrap justify-center gap-0.5" aria-hidden="true">{events.slice(0, 3).map(renderDot)}{events.length > 3 && <span className="text-[9px] text-tertiary">+{events.length - 3}</span>}</span>
    </InteractiveSurface>
    return <div className={cn('flex min-h-36 min-w-0 flex-col gap-1 border-r border-b border-secondary p-2', !isCurrentMonth && 'bg-secondary/60')}>
        <InteractiveSurface aria-label={dayLabel} aria-haspopup="dialog" onClick={selectDate} className={cn(dateClass, 'self-start hover:ring-2 hover:ring-border-secondary')}>{date.getDate()}</InteractiveSurface>
        <div className="flex min-w-0 flex-col gap-1">{events.slice(0, 3).map(renderItem)}</div>
        {events.length > 3 && <InteractiveSurface onClick={selectDate} aria-label={`Show all ${events.length} items on ${formatCalendarDate(date)}`} className="px-1 text-left label-xs text-tertiary hover:text-primary">{events.length - 3} more…</InteractiveSurface>}
    </div>
}
