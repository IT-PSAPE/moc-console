import { cn } from '@/utils/cn'
import { useCallback, useMemo, useState, type HTMLAttributes, type ReactNode } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../controls/button'
import { Drawer } from '../overlays/drawer'
import { Label, Paragraph } from './text'
import { EmptyState } from '../feedback/empty-state'

// ─── Helpers ─────────────────────────────────────────────

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

const MONTH_LABELS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
] as const

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

export type CellDrawerConfig<T = unknown> = {
    title?: string | ((date: Date, events: CalendarEvent<T>[]) => string)
    renderItem: (event: CalendarEvent<T>, index: number) => ReactNode
}

// ─── Root ────────────────────────────────────────────────

type CalendarRootProps<T = unknown> = HTMLAttributes<HTMLDivElement> & {
    defaultMonth?: Date
    events?: CalendarEvent<T>[]
    onMonthChange?: (date: Date) => void
    renderDay?: (props: RenderDayProps<T>) => ReactNode
    cellDrawer?: CellDrawerConfig<T>
}

const DAY_NAMES = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
] as const

function formatDrawerDate(date: Date) {
    return `${DAY_NAMES[date.getDay()]}, ${date.getDate()} ${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`
}

function CalendarRoot<T = unknown>({ className, defaultMonth, events = [], onMonthChange, renderDay, cellDrawer, ...props }: CalendarRootProps<T>) {
    const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(defaultMonth ?? new Date()))
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const today = useMemo(() => new Date(), [])

    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const days = useMemo(() => getCalendarDays(year, month), [year, month])

    const navigate = useCallback((offset: number) => {
        setCurrentMonth(prev => {
            const next = new Date(prev.getFullYear(), prev.getMonth() + offset, 1)
            onMonthChange?.(next)
            return next
        })
    }, [onMonthChange])

    const goToToday = useCallback(() => {
        const next = startOfMonth(new Date())
        setCurrentMonth(next)
        onMonthChange?.(next)
    }, [onMonthChange])

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

    const selectedDateEvents = useMemo(() => {
        if (!selectedDate) return []
        return getEventsForDate(selectedDate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDate, eventsByDate])

    const drawerTitle = useMemo(() => {
        if (!selectedDate) return ''
        if (!cellDrawer?.title) return formatDrawerDate(selectedDate)
        if (typeof cellDrawer.title === 'string') return cellDrawer.title
        return cellDrawer.title(selectedDate, selectedDateEvents)
    }, [selectedDate, cellDrawer?.title, selectedDateEvents])

    return (
        <div className={cn('flex flex-col', className)} {...props}>
            {/* Header */}
            <div className="flex items-center justify-between pb-4">
                <span className="title-h5">{MONTH_LABELS[month]} {year}</span>
                <div className="flex items-center gap-1">
                    <Button.Icon variant="secondary" icon={<ChevronLeft />} onClick={() => navigate(-1)} />
                    <Button variant="secondary" onClick={goToToday}>Today</Button>
                    <Button.Icon variant="secondary" icon={<ChevronRight />} onClick={() => navigate(1)} />
                </div>
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

                    const cellContent = renderDay
                        ? renderDay({ date, isCurrentMonth, isToday: isDateToday, events: dayEvents })
                        : <CalendarCell date={date} events={dayEvents} isCurrentMonth={isCurrentMonth} isToday={isDateToday} />

                    if (cellDrawer) {
                        return (
                            <div
                                key={index}
                                className={cn(
                                    'border-r border-b border-secondary cursor-pointer transition-colors hover:bg-secondary/50',
                                    !renderDay && '[&>div]:border-0',
                                )}
                                onClick={() => setSelectedDate(date)}
                            >
                                {cellContent}
                            </div>
                        )
                    }

                    if (renderDay) {
                        return (
                            <div key={index} className="border-r border-b border-secondary">
                                {cellContent}
                            </div>
                        )
                    }

                    return <CalendarCell key={index} date={date} events={dayEvents} isCurrentMonth={isCurrentMonth} isToday={isDateToday} />
                })}
            </div>

            {/* Cell drawer */}
            {cellDrawer && (
                <Drawer.Root
                    open={selectedDate !== null}
                    onOpenChange={(open) => { if (!open) setSelectedDate(null) }}
                >
                    <Drawer.Portal>
                        <Drawer.Backdrop />
                        <Drawer.Panel>
                            <Drawer.Header>
                                <div className="flex-1">
                                    <Label.md>{drawerTitle}</Label.md>
                                    <Paragraph.xs className="text-tertiary">
                                        {selectedDateEvents.length} {selectedDateEvents.length === 1 ? 'event' : 'events'}
                                    </Paragraph.xs>
                                </div>
                                <Drawer.Close>
                                    <Button.Icon variant="ghost" icon={<ChevronRight />} />
                                </Drawer.Close>
                            </Drawer.Header>
                            <Drawer.Content>
                                {selectedDateEvents.length === 0 ? (
                                    <EmptyState
                                        icon={<CalendarDays />}
                                        title="No events"
                                        description="There are no events scheduled for this day."
                                    />
                                ) : (
                                    <div className="flex flex-col">
                                        {selectedDateEvents.map((event, i) => cellDrawer.renderItem(event, i))}
                                    </div>
                                )}
                            </Drawer.Content>
                        </Drawer.Panel>
                    </Drawer.Portal>
                </Drawer.Root>
            )}
        </div>
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

type CalendarCellProps<T = unknown> = {
    date: Date
    events: CalendarEvent<T>[]
    isCurrentMonth: boolean
    isToday: boolean
}

function CalendarCell({ date, events, isCurrentMonth, isToday }: CalendarCellProps) {
    return (
        <div className={cn(
            'flex min-h-24 flex-col border-r border-b border-secondary p-1.5',
            !isCurrentMonth && 'bg-secondary',
        )}>
            <span className={cn(
                'mb-1 inline-flex size-6 items-center justify-center self-start rounded-full text-paragraph-xs',
                isToday && 'bg-brand_solid text-primary_on-brand',
                !isToday && isCurrentMonth && 'text-primary',
                !isToday && !isCurrentMonth && 'text-quaternary',
            )}>
                {date.getDate()}
            </span>
            <div className="flex flex-col gap-0.5 overflow-hidden">
                {events.slice(0, 2).map((event, i) => (
                    <div
                        key={i}
                        className={cn(
                            'truncate rounded px-1.5 py-0.5 text-paragraph-xs',
                            eventColorMap[event.color ?? 'gray'],
                        )}
                        title={event.label}
                    >
                        {event.label}
                    </div>
                ))}
                {events.length > 2 && (
                    <span className="px-1.5 text-paragraph-xs text-quaternary">+{events.length - 2} more</span>
                )}
            </div>
        </div>
    )
}

// ─── Compound Export ─────────────────────────────────────

export const Calendar = {
    Root: CalendarRoot,
    Cell: CalendarCell,
}
