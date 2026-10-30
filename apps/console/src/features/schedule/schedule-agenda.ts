import type { CalendarEvent } from '@moc/ui/components/display/calendar'
import { getCalendarDateKey } from '@moc/utils/calendar-date-range'
import { getAgendaGroups } from './schedule-events'
import type { ScheduleEvent, ScheduleItemKind } from './schedule-types'

export type ScheduleAgendaItem = {
  id: string
  title: string
  kind: ScheduleItemKind | 'stream' | 'meeting' | 'message'
  href: string
  timeLabel: string
  detail: string
  accessibleLabel: string
  color: CalendarEvent['color']
}
export type ScheduleAgendaGroup = {
  key: string
  label: string
  relativeLabel?: 'Today'
  items: ScheduleAgendaItem[]
}
export type ScheduleAgendaLabelOption = { value: string; label: string }
export type ScheduleAgendaOptions = { categories: ScheduleAgendaLabelOption[]; venues: ScheduleAgendaLabelOption[]; venueEvents: ScheduleAgendaLabelOption[] }
const dateFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
const shortDateFormatter = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' })
const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const kindLabels: Record<ScheduleItemKind, string> = {
  request: 'Request', 'equipment-checkout': 'Equipment collection', 'equipment-return': 'Equipment return', venue: 'Venue booking',
}

function getTimeLabel(event: CalendarEvent): string {
  if (event.allDay) return 'All day'
  const start = timeFormatter.format(event.date)
  if (!event.endDate || !Number.isFinite(event.endDate.getTime()) || event.endDate <= event.date) return start
  const endDate = getCalendarDateKey(event.date) === getCalendarDateKey(event.endDate) ? '' : `${shortDateFormatter.format(event.endDate)} `
  return `${start} – ${endDate}${timeFormatter.format(event.endDate)}`
}

function getDetail(item: ScheduleEvent, options: ScheduleAgendaOptions): string {
  const parts = [kindLabels[item.kind]]
  if (item.type === 'request') {
    const category = options.categories.find(option => option.value === item.category)
    if (category) parts.push(category.label)
  }
  if (item.type === 'venue') {
    const venue = options.venues.find(option => option.value === item.venueId)
    const event = options.venueEvents.find(option => option.value === item.eventId)
    if (venue) parts.push(venue.label)
    if (event) parts.push(event.label)
  }
  return parts.join(' · ')
}

export function getScheduleEventItem(event: CalendarEvent<ScheduleEvent>, options: ScheduleAgendaOptions): ScheduleAgendaItem | null {
  const data = event.data
  if (!data) return null
  const timeLabel = getTimeLabel(event)
  const detail = getDetail(data, options)
  return { id: event.id ?? `${data.kind}:${data.id}:${event.date.toISOString()}`, title: data.title, kind: data.kind, href: data.href, timeLabel, detail, color: event.color, accessibleLabel: `${data.title}, ${timeLabel}, ${detail}` }
}

function compareEvents(left: CalendarEvent, right: CalendarEvent): number {
  return Number(Boolean(right.allDay)) - Number(Boolean(left.allDay)) || left.date.getTime() - right.date.getTime()
}

export function getScheduleAgendaGroups(events: CalendarEvent<ScheduleEvent>[], options: ScheduleAgendaOptions, today = new Date()): ScheduleAgendaGroup[] {
  const todayKey = getCalendarDateKey(today)
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const overdue: ScheduleAgendaGroup = { key: 'overdue', label: 'Overdue', items: [] }
  const groups: ScheduleAgendaGroup[] = []
  for (const group of getAgendaGroups(events)) {
    const items = [...group.events].sort(compareEvents).flatMap(event => {
      const item = getScheduleEventItem(event, options)
      return item ? [item] : []
    })
    if (!items.length) continue
    const dateLabel = dateFormatter.format(group.date)
    if (group.date.getTime() < todayStart) {
      overdue.items.push(...items.map(item => ({ ...item, detail: `${dateLabel} · ${item.detail}`, accessibleLabel: `${item.accessibleLabel}, ${dateLabel}` })))
      continue
    }
    const key = getCalendarDateKey(group.date)
    groups.push({ key, label: dateLabel, relativeLabel: key === todayKey ? 'Today' : undefined, items })
  }
  return overdue.items.length ? [overdue, ...groups] : groups
}
