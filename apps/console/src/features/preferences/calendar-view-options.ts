import type { CalendarView } from '@moc/sdk/users'

export const calendarViewOptions: { value: CalendarView; label: string }[] = [
  { value: 'day', label: 'Day view' },
  { value: 'week', label: 'Week view' },
  { value: 'month', label: 'Month view' },
  { value: 'agenda', label: 'Agenda view' },
]

export function getCalendarView(value: string | null, fallback: CalendarView): CalendarView {
  return calendarViewOptions.find(option => option.value === value)?.value ?? fallback
}
