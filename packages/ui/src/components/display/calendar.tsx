import { cn } from '@moc/utils/cn'
import { useCallback, useMemo, useState, type HTMLAttributes, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Button } from '../controls/button'
import { ButtonGroup } from '../controls/button-group'
import { InteractiveSurface } from '../controls/interactive-surface'
import { useIsMobile } from '../../hooks/use-is-mobile'
import { Drawer } from '../overlays/drawer'
import { Label, Paragraph } from './text'

// ─── Helpers ─────────────────────────────────────────────

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

const MONTH_LABELS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
] as const

const FULL_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
    year: 'numeric',
})

function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function startOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1)
}

function getCalendarDays(year: number, month: number) {
    const first = new Date(year, month, 1)
    const startOffset = first.getDay() // 0 = Sunday

    const days: Date[] = []

    // Previous month overflow
    for (let i = startOffset - 1; i >= 0; i--) {
        days.push(new Date(year, month, -i))
    }

    // Current month
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    for (let d = 1; d <= daysInMonth; d++) {
        days.push(new Date(year, month, d))
    }

    // Next month overflow to fill 6 rows
    const remaining = 42 - days.length
    for (let d = 1; d <= remaining; d++) {
        days.push(new Date(year, month + 1, d))
    }

    return days
}

// ─── Types ───────────────────────────────────────────────

export type CalendarEvent<T = unknown> = {
    id?: string
    date: Date
    label: string
    color?: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'gray'
    data?: T
}

type RenderDayProps<T = unknown> = {
    date: Date
    isCurrentMonth: boolean
    isToday: boolean
    events: CalendarEvent<T>[]
}

// ─── Root ────────────────────────────────────────────────

type CalendarRootProps<T = unknown> = HTMLAttributes<HTMLDivElement> & {
    defaultMonth?: Date
    events?: CalendarEvent<T>[]
    onMonthChange?: (date: Date) => void
    renderDay?: (props: RenderDayProps<T>) => ReactNode
    renderEvent?: (event: CalendarEvent<T>, index: number) => ReactNode
}

function CalendarRoot<T = unknown>({ className, defaultMonth, events = [], onMonthChange, renderDay, renderEvent, ...props }: CalendarRootProps<T>) {
    const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(defaultMonth ?? new Date()))
    const [previewOpen, setPreviewOpen] = useState(false)
    const [selectedDate, setSelectedDate] = useState(() => defaultMonth ?? new Date())
    const isMobile = useIsMobile()
    const today = useMemo(() => new Date(), [])

    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const days = useMemo(() => getCalendarDays(year, month), [year, month])

    const navigate = useCallback((offset: number) => {
        setCurrentMonth(prev => {
            const next = new Date(prev.getFullYear(), prev.getMonth() + offset, 1)
            setPreviewOpen(false)
            setSelectedDate(next)
            onMonthChange?.(next)
            return next
        })
    }, [onMonthChange])

    const goToToday = useCallback(() => {
        const next = startOfMonth(new Date())
        setCurrentMonth(next)
        setPreviewOpen(false)
        setSelectedDate(new Date())
        onMonthChange?.(next)
    }, [onMonthChange])

    const selectDate = useCallback((date: Date) => {
        setSelectedDate(date)
        setPreviewOpen(true)
        setCurrentMonth(previousMonth => {
            if (previousMonth.getFullYear() === date.getFullYear() && previousMonth.getMonth() === date.getMonth()) return previousMonth
            const nextMonth = startOfMonth(date)
            onMonthChange?.(nextMonth)
            return nextMonth
        })
    }, [onMonthChange])

    function handlePreviousMonth() {
        navigate(-1)
    }

    function handleNextMonth() {
        navigate(1)
    }

    const eventsByDate = useMemo(() => {
        const map = new Map<string, CalendarEvent<T>[]>()

        for (const event of events) {
            const key = `${event.date.getFullYear()}-${event.date.getMonth()}-${event.date.getDate()}`

            if (!map.has(key)) {
                map.set(key, [])
            }

            map.get(key)!.push(event)
        }

        return map
    }, [events])

    function getEventsForDate(date: Date) {
        const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
        return eventsByDate.get(key) ?? []
    }

    const selectedEvents = getEventsForDate(selectedDate)
    const selectedEventCount = `${selectedEvents.length} event${selectedEvents.length === 1 ? '' : 's'}`

    return (
        <>
        <div className={cn('flex flex-col', className)} {...props}>
            {/* Header */}
            <div className="flex items-center justify-between pb-4">
                <span className="label-md">{MONTH_LABELS[month]} {year}</span>
                <ButtonGroup aria-label="Calendar navigation">
                    <Button.Icon aria-label="Previous month" variant="secondary" icon={<ChevronLeft />} onClick={handlePreviousMonth} />
                    <Button variant="secondary" onClick={goToToday}>Today</Button>
                    <Button.Icon aria-label="Next month" variant="secondary" icon={<ChevronRight />} onClick={handleNextMonth} />
                </ButtonGroup>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 border-t border-l border-secondary">
                {DAY_LABELS.map(day => (
                    <div key={day} className="border-r border-b border-secondary px-2 py-1.5 text-center">
                        <span className="label-xs text-tertiary">{day}</span>
                    </div>
                ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 border-l border-secondary">
                {days.map((date, index) => {
                    const isCurrentMonth = date.getMonth() === month
                    const isDateToday = isSameDay(date, today)
                    const dayEvents = getEventsForDate(date)

                    if (renderDay) {
                        return (
                            <div key={index} className="border-r border-b border-secondary">
                                {renderDay({ date, isCurrentMonth, isToday: isDateToday, events: dayEvents })}
                            </div>
                        )
                    }

                    return <CalendarCell key={index} date={date} events={dayEvents} isCurrentMonth={isCurrentMonth} isMobile={isMobile} isSelected={isSameDay(date, selectedDate)} isToday={isDateToday} onSelect={selectDate} renderEvent={renderEvent} />
                })}
            </div>

        </div>
        {isMobile && !renderDay ? (
            <Drawer open={previewOpen} onOpenChange={setPreviewOpen} mobileSide="bottom">
                <Drawer.Portal>
                    <Drawer.Backdrop />
                    <Drawer.Panel aria-label={`Events on ${FULL_DATE_FORMATTER.format(selectedDate)}`}>
                        <Drawer.Header>
                            <div className="min-w-0 flex-1">
                                <Label.md className="block truncate">{FULL_DATE_FORMATTER.format(selectedDate)}</Label.md>
                                <Paragraph.xs className="text-tertiary">{selectedEventCount}</Paragraph.xs>
                            </div>
                            <Drawer.Close>
                                <Button.Icon aria-label="Close day preview" variant="ghost" icon={<X />} />
                            </Drawer.Close>
                        </Drawer.Header>
                        <Drawer.Content className="px-4 py-4">
                            {selectedEvents.length > 0 ? (
                                <div className="flex flex-col gap-1.5">
                                    {selectedEvents.map((event, index) => renderEvent
                                        ? renderEvent(event, index)
                                        : <CalendarEventContent key={event.id ?? index} color={event.color} aria-label={event.label}>{event.label}</CalendarEventContent>
                                    )}
                                </div>
                            ) : (
                                <Paragraph.sm className="py-3 text-tertiary">No events scheduled for this day.</Paragraph.sm>
                            )}
                        </Drawer.Content>
                    </Drawer.Panel>
                </Drawer.Portal>
            </Drawer>
        ) : null}
        </>
    )
}

// ─── Cell ────────────────────────────────────────────────

const eventColorMap: Record<string, string> = {
    red: 'bg-error_primary text-error',
    orange: 'bg-warning_primary text-warning',
    yellow: 'bg-warning_primary text-warning',
    green: 'bg-success_primary text-success',
    blue: 'bg-[var(--color-utility-blue-50)] text-[var(--color-utility-blue-700)]',
    purple: 'bg-brand_primary text-brand_secondary',
    gray: 'bg-secondary text-tertiary',
}

const eventDotColorMap: Record<NonNullable<CalendarEvent['color']>, string> = {
    red: 'bg-utility-red-500',
    orange: 'bg-utility-orange-500',
    yellow: 'bg-utility-yellow-500',
    green: 'bg-utility-green-500',
    blue: 'bg-utility-blue-500',
    purple: 'bg-utility-purple-500',
    gray: 'bg-utility-gray-500',
}

type CalendarCellProps<T = unknown> = {
    date: Date
    events: CalendarEvent<T>[]
    isCurrentMonth: boolean
    isMobile?: boolean
    isSelected?: boolean
    isToday: boolean
    onSelect?: (date: Date) => void
    renderEvent?: (event: CalendarEvent<T>, index: number) => ReactNode
}

function CalendarCell<T = unknown>({ date, events, isCurrentMonth, isMobile = false, isSelected = false, isToday, onSelect, renderEvent }: CalendarCellProps<T>) {
    function handleSelect() {
        onSelect?.(date)
    }

    const eventCountLabel = `${events.length} event${events.length === 1 ? '' : 's'}`

    if (isMobile) {
        return (
            <InteractiveSurface
                aria-label={`${FULL_DATE_FORMATTER.format(date)}, ${eventCountLabel}`}
                aria-haspopup="dialog"
                aria-pressed={isSelected}
                className={cn(
                    'flex min-h-14 w-full flex-col items-center justify-center gap-1 border-r border-b border-secondary p-1 text-center',
                    !isCurrentMonth && 'bg-secondary',
                    isSelected && 'bg-brand_primary outline-2 -outline-offset-2 outline-brand',
                )}
                onClick={handleSelect}
            >
                <CalendarDate date={date} isCurrentMonth={isCurrentMonth} isToday={isToday} />
                <span className="flex h-2 items-center justify-center gap-0.5" aria-hidden="true">
                    {events.slice(0, 3).map((event, index) => (
                        <span key={event.id ?? index} className={cn('size-1.5 rounded-full', eventDotColorMap[event.color ?? 'gray'])} />
                    ))}
                    {events.length > 3 ? <span className="paragraph-xs text-tertiary">+{events.length - 3}</span> : null}
                </span>
            </InteractiveSurface>
        )
    }

    return (
        <div className={cn(
            'flex min-h-24 flex-col border-r border-b border-secondary p-1.5',
            !isCurrentMonth && 'bg-secondary',
        )}>
            <CalendarDate date={date} isCurrentMonth={isCurrentMonth} isToday={isToday} />
            <div className="flex flex-col gap-0.5">
                {events.map((event, index) => renderEvent
                    ? renderEvent(event, index)
                    : <CalendarEventContent key={event.id ?? index} color={event.color} aria-label={event.label}>{event.label}</CalendarEventContent>
                )}
            </div>
        </div>
    )
}

function CalendarDate({ date, isCurrentMonth, isToday }: { date: Date; isCurrentMonth: boolean; isToday: boolean }) {
    return (
        <span className={cn(
            'inline-flex size-6 items-center justify-center rounded-full paragraph-xs md:mb-1 md:self-start',
            isToday && 'bg-brand_solid text-primary_on-brand',
            !isToday && isCurrentMonth && 'text-primary',
            !isToday && !isCurrentMonth && 'text-quaternary',
        )}>
            {date.getDate()}
        </span>
    )
}

type CalendarEventContentProps = HTMLAttributes<HTMLDivElement> & {
    color?: CalendarEvent['color']
}

function CalendarEventContent({ children, className, color = 'gray', ...props }: CalendarEventContentProps) {
    return (
        <div className={cn('truncate rounded px-1.5 py-0.5 paragraph-xs', eventColorMap[color], className)} {...props}>
            {children}
        </div>
    )
}

// ─── Compound Export ─────────────────────────────────────

export const Calendar = Object.assign(CalendarRoot, {
    Cell: CalendarCell,
    Event: CalendarEventContent,
})
