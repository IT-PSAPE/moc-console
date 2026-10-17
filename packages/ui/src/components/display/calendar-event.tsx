import { cn } from '@moc/utils/cn'
import type { CalendarEvent } from './calendar-types'
import type { HTMLAttributes, ReactNode } from 'react'
import { calendarEventColorClasses } from './calendar-event-colors'

type CalendarEventContentProps = HTMLAttributes<HTMLDivElement> & { color?: CalendarEvent['color']; time?: string; icon?: ReactNode }

// Default is the compact all-day/month chip (`h-6`). Timed week/day blocks
// need a duration-driven height instead — `calendar-range.tsx` overrides this
// back to `h-full flex-col items-start gap-0.5` for just those.
export function CalendarEventContent({ children, className, color = 'gray', time, icon, ...props }: CalendarEventContentProps) {
    return <div data-calendar-event="" className={cn('flex h-6 min-w-0 items-center gap-1 overflow-hidden rounded-md border px-1.5 text-xs font-medium whitespace-nowrap', calendarEventColorClasses[color], className)} {...props}><span className="flex min-w-0 max-w-full flex-1 items-start gap-1">{icon && <span aria-hidden="true" className="flex size-[1lh] shrink-0 items-center justify-center [&_svg]:size-full">{icon}</span>}<span data-calendar-event-title="" className="min-w-0 truncate">{children}</span></span>{time && <span className="shrink-0 text-[10px] opacity-80">{time}</span>}</div>
}
