import { cn } from '@moc/utils/cn'
import type { CalendarEvent } from './calendar-types'
import type { HTMLAttributes } from 'react'

const eventColorMap: Record<NonNullable<CalendarEvent['color']>, string> = {
    red: 'bg-error text-error border-current/20',
    orange: 'bg-warning text-warning border-current/20',
    yellow: 'bg-warning text-warning border-current/20',
    green: 'bg-success text-success border-current/20',
    blue: 'bg-utility-blue-50 text-utility-blue-700 border-current/20',
    purple: 'bg-utility-purple-50 text-utility-purple-700 border-current/20',
    gray: 'bg-secondary text-secondary border-secondary',
}

type CalendarEventContentProps = HTMLAttributes<HTMLDivElement> & { color?: CalendarEvent['color']; time?: string }

export function CalendarEventContent({ children, className, color = 'gray', time, ...props }: CalendarEventContentProps) {
    return <div data-calendar-event="" className={cn('flex h-full min-w-0 items-start gap-1 overflow-hidden rounded-md border px-1.5 py-1 paragraph-xs [&[data-timed]]:flex-col [&[data-timed]]:gap-0.5', eventColorMap[color], className)} {...props}><span className="min-w-0 flex-1 truncate font-medium">{children}</span>{time && <span className="shrink-0 text-[10px] opacity-80">{time}</span>}</div>
}
