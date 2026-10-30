import type { CalendarEvent } from './calendar-types'

export const calendarPastEventClasses = 'transition-opacity motion-reduce:transition-none data-[calendar-past]:opacity-50 data-[calendar-past]:hover:opacity-100 data-[calendar-past]:focus-within:opacity-100'

export const calendarEventColorClasses: Record<NonNullable<CalendarEvent['color']>, string> = {
  red: 'bg-error text-error border-current/20',
  orange: 'bg-warning text-warning border-current/20',
  yellow: 'bg-warning text-warning border-current/20',
  green: 'bg-success text-success border-current/20',
  blue: 'bg-utility-blue-50 text-utility-blue-700 border-current/20',
  purple: 'bg-utility-purple-50 text-utility-purple-700 border-current/20',
  gray: 'bg-secondary text-secondary border-secondary',
}
