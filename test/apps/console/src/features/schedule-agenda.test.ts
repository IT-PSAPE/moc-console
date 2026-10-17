import { describe, expect, it } from 'vitest'
import { getScheduleAgendaGroups, getScheduleEventItem } from '../../../../../apps/console/src/features/schedule/schedule-agenda'
import type { CalendarEvent } from '../../../../../packages/ui/src/components/display/calendar-types'
import type { ScheduleEvent } from '../../../../../apps/console/src/features/schedule/schedule-types'

const today = new Date(2026, 9, 16, 12)
const options = {
  categories: [{ value: 'photo', label: 'Photography' }],
  venues: [{ value: 'studio', label: 'Studio A' }],
  venueEvents: [{ value: 'training', label: 'Training' }],
}
function event(id: string, date: Date, timing: Partial<CalendarEvent<ScheduleEvent>> = {}, detail: Partial<ScheduleEvent> = {}): CalendarEvent<ScheduleEvent> {
  return { id, date, label: id, data: { id, type: 'request', kind: 'request', title: id, href: `/requests/${id}`, category: 'photo', ...detail }, ...timing }
}

describe('agenda presentation', () => {
  it('builds readable event details for request, venue, and equipment events', () => {
    const request = getScheduleEventItem(event('request', new Date(2026, 9, 16, 11)), options)
    const venue = getScheduleEventItem(event('venue', new Date(2026, 9, 16, 8, 45), { endDate: new Date(2026, 9, 16, 10) }, { type: 'venue', kind: 'venue', venueId: 'studio', eventId: 'training', href: '/venues/booking-1' }), options)
    const collection = getScheduleEventItem(event('collection', new Date(2026, 9, 16, 9), {}, { type: 'equipment', kind: 'equipment-checkout' }), options)
    const returnItem = getScheduleEventItem(event('return', new Date(2026, 9, 16, 16), {}, { type: 'equipment', kind: 'equipment-return', outstanding: true }), options)

    expect(request).toMatchObject({ kind: 'request', detail: 'Request · Photography', timeLabel: '11:00', href: '/requests/request' })
    expect(venue).toMatchObject({ kind: 'venue', detail: 'Venue booking · Studio A · Training', timeLabel: '08:45 – 10:00', href: '/venues/booking-1' })
    expect(collection).toMatchObject({ kind: 'equipment-checkout', detail: 'Equipment collection', timeLabel: '09:00' })
    expect(returnItem).toMatchObject({ kind: 'equipment-return', detail: 'Equipment return', timeLabel: '16:00' })
  })

  it('returns no event item when the calendar event has no linked data', () => {
    expect(getScheduleEventItem({ date: today, label: 'Unlinked event' }, options)).toBeNull()
  })

  it('groups dates in order, marks today and overdue work, and sorts all-day items before timed items', () => {
    const groups = getScheduleAgendaGroups([
      event('later', new Date(2026, 9, 16, 15)),
      event('tomorrow', new Date(2026, 9, 17, 9)),
      event('earlier', new Date(2026, 9, 16, 9)),
      event('all-day', new Date(2026, 9, 16), { allDay: true }),
      event('late-return', new Date(2026, 9, 15), { allDay: true, color: 'orange' }, { type: 'equipment', kind: 'equipment-return', outstanding: true }),
    ], options, today)
    expect(groups.map(group => group.relativeLabel)).toEqual(['Overdue', 'Today', undefined])
    expect(groups[1].items.map(item => item.id)).toEqual(['all-day', 'earlier', 'later'])
    expect(groups[1].items[0].timeLabel).toBe('All day')
    expect(groups[0].items[0].detail).toBe('Equipment return')
  })

  it('uses configured labels and real venue start/end times without changing destination links', () => {
    const groups = getScheduleAgendaGroups([
      event('venue', new Date(2026, 9, 16, 8, 45), { endDate: new Date(2026, 9, 16, 10), color: 'purple' }, { type: 'venue', kind: 'venue', venueId: 'studio', eventId: 'training', href: '/venues/booking-1' }),
      event('request', new Date(2026, 9, 16, 11)),
    ], options, today)
    expect(groups[0].items[0]).toMatchObject({ timeLabel: '08:45 – 10:00', detail: 'Venue booking · Studio A · Training', href: '/venues/booking-1', color: 'purple' })
    expect(groups[0].items[1].detail).toBe('Request · Photography')
    expect(groups[0].items[1].timeLabel).toBe('11:00')
  })

  it('names the end date for overnight bookings and ignores events without a linked item', () => {
    const groups = getScheduleAgendaGroups([
      event('overnight', new Date(2026, 9, 16, 22), { endDate: new Date(2026, 9, 17, 1) }),
      { date: today, label: 'Unlinked event' },
    ], options, today)
    expect(groups[0].items).toHaveLength(1)
    expect(groups[0].items[0].timeLabel).toMatch(/^22:00 – .*17.*01:00$/)
    expect(getScheduleAgendaGroups([], options, today)).toEqual([])
  })
})
