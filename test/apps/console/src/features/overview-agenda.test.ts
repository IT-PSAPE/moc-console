import { describe, expect, test } from 'vitest'
import type { OverviewItemKind } from '@moc/sdk/users'
import type { UpcomingScheduledMessage } from '@moc/sdk/overview'
import type { Request } from '@moc/types/requests'
import type { Booking } from '@moc/types/equipment/booking'
import type { VenueBooking } from '@moc/types/venues'
import type { Stream } from '@moc/types/streams/stream'
import type { ZoomMeeting } from '@moc/types/streams/zoom'
import { getOverviewAgendaGroups, type OverviewAgendaInput } from '../../../../../apps/console/src/features/overview/overview-agenda'
import { getOverviewMeetingOccurrences } from '../../../../../apps/console/src/features/overview/overview-meeting-occurrences'

const now = new Date('2026-10-29T12:00:00Z')
const kinds: OverviewItemKind[] = ['request', 'equipment', 'venue', 'stream', 'message']
const options = { categories: [{ value: 'crew', label: 'Crew' }], venues: [], venueEvents: [] }
function request(id: string, dueDate: string, status: Request['status'] = 'not_started'): Request {
  return { id, title: id, dueDate, status, category: 'crew' } as Request
}
function booking(id: string, checkedOutDate: string, expectedReturnAt: string, status: Booking['status'] = 'booked'): Booking {
  return { id, title: id, checkedOutDate, expectedReturnAt, status, returnedDate: null } as Booking
}
function venue(id: string, startsAt: string, endsAt: string, status: VenueBooking['status'] = 'approved'): VenueBooking {
  return { id, title: id, status, occurrences: [{ index: 0, startsAt, endsAt }] } as VenueBooking
}
function stream(id: string, scheduledStartTime: string | null, fields: Partial<Stream> = {}): Stream {
  return { id, title: id, streamStatus: 'ready', scheduledStartTime, actualEndTime: null, actualStartTime: null, ...fields } as Stream
}
function meeting(fields: Partial<ZoomMeeting> = {}): ZoomMeeting {
  return { id: 'meeting', topic: 'Meeting', startTime: '2026-10-29T13:00:00Z', duration: 60, timezone: 'UTC', meetingType: 'scheduled', recurrenceType: 'none', recurrenceInterval: null, recurrenceDays: null, ...fields } as ZoomMeeting
}
function agenda(fields: Partial<OverviewAgendaInput> = {}) {
  return getOverviewAgendaGroups({ work: { requests: [], bookings: [], venueBookings: [] }, streams: [], meetings: [], messages: [], kinds, options, now, timezone: 'UTC', ...fields })
}

describe('Overview upcoming agenda', () => {
  test('merges sources chronologically and groups today, tomorrow, and later dates', () => {
    const groups = agenda({
      work: { requests: [request('tomorrow', '2026-10-30T08:00:00Z'), request('request', '2026-10-29T14:00:00Z')], bookings: [booking('equipment', '2026-10-29T15:00:00Z', '2026-10-31T15:00:00Z')], venueBookings: [] },
      streams: [stream('stream', '2026-10-29T13:00:00Z')],
      messages: [{ id: 'message', title: 'Message', scheduledFor: '2026-10-29T12:30:00Z', status: 'scheduled' }],
    })
    expect(groups.map((group) => group.key)).toEqual(['2026-10-29', '2026-10-30', '2026-10-31'])
    expect(groups.slice(0, 2).map((group) => group.label)).toEqual(['Today', 'Tomorrow'])
    expect(groups[2].label).toContain('Saturday')
    expect(groups[0].items.map((item) => item.kind)).toEqual(['message', 'stream', 'request', 'equipment-checkout'])
    expect(groups[0].items[0].href).toBe('/scheduled-messages?occurrence=message')
    expect(groups[0].items[1].href).toBe('/streams/stream/stream')
    expect(groups[0].items[2].detail).toBe('Request · Crew')
  })

  test('excludes overdue points and completed or cancelled records but retains ongoing intervals', () => {
    const groups = agenda({
      work: {
        requests: [request('overdue', '2026-10-28'), request('finished', '2026-10-30', 'completed'), request('archived', '2026-10-30', 'archived')],
        bookings: [booking('returned', '2026-10-30', '2026-10-31', 'returned')],
        venueBookings: [venue('ongoing', '2026-10-29T11:00:00Z', '2026-10-29T13:00:00Z'), venue('ended', '2026-10-29T09:00:00Z', '2026-10-29T11:00:00Z'), venue('cancelled', '2026-10-30T13:00:00Z', '2026-10-30T14:00:00Z', 'cancelled')],
      },
      streams: [stream('complete', '2026-10-30T12:00:00Z', { streamStatus: 'complete' }), stream('live', '2026-10-28T12:00:00Z', { streamStatus: 'live' })],
    })
    expect(groups.map((group) => group.label)).toEqual(['Today'])
    expect(groups[0].items.map((item) => item.title)).toEqual(['live', 'ongoing'])
    expect(groups[0].items[0].timeLabel).toBe('Live now')
  })

  test('retains date-only today items until midnight in the display timezone', () => {
    const work = { requests: [request('all-day', '2026-10-29')], bookings: [], venueBookings: [] }
    expect(agenda({ work, now: new Date('2026-10-29T20:59:00Z'), timezone: 'Africa/Nairobi' })[0].items[0].timeLabel).toBe('All day')
    expect(agenda({ work, now: new Date('2026-10-29T21:00:00Z'), timezone: 'Africa/Nairobi' })).toEqual([])
  })

  test('applies an explicit empty filter and groups Zoom with the stream filter', () => {
    expect(agenda({ kinds: [], meetings: [meeting()] })).toEqual([])
    expect(agenda({ kinds: ['stream'], meetings: [meeting()] })[0].items[0]).toMatchObject({ kind: 'meeting', href: '/streams/meeting/meeting' })
    expect(agenda({ kinds: ['request'], meetings: [meeting()] })).toEqual([])
  })

  test('ignores invalid dates, ended streams, no-fixed-time meetings, and non-upcoming message states', () => {
    expect(agenda({
      streams: [stream('invalid', 'invalid'), stream('ended', '2026-10-30T12:00:00Z', { actualEndTime: '2026-10-29T11:00:00Z' })],
      meetings: [meeting({ meetingType: 'recurring_no_fixed' }), meeting({ startTime: 'invalid' })],
      messages: [{ id: 'old', title: 'Old', scheduledFor: '2026-10-29T11:59:59Z', status: 'scheduled' }, { id: 'cancelled', title: 'Cancelled', scheduledFor: '2026-10-30T12:00:00Z', status: 'cancelled' } as unknown as UpcomingScheduledMessage],
    })).toEqual([])
  })
})

describe('Overview recurring Zoom meetings', () => {
  test('expands an old daily seed into future occurrences with the interval intact', () => {
    const occurrences = getOverviewMeetingOccurrences(meeting({ meetingType: 'recurring_fixed', recurrenceType: 'daily', recurrenceInterval: 2, startTime: '2026-10-01T13:00:00Z' }), now, 5)
    expect(occurrences.map((occurrence) => occurrence.date.toISOString())).toEqual(['2026-10-29T13:00:00.000Z', '2026-10-31T13:00:00.000Z', '2026-11-02T13:00:00.000Z'])
  })

  test('honors weekly days and repeat intervals across the new year', () => {
    const occurrences = getOverviewMeetingOccurrences(meeting({ meetingType: 'recurring_fixed', recurrenceType: 'weekly', recurrenceInterval: 2, recurrenceDays: '2,6', startTime: '2026-12-21T09:00:00Z' }), new Date('2026-12-28T00:00:00Z'), 12)
    expect(occurrences.map((occurrence) => occurrence.date.toISOString())).toEqual(['2027-01-04T09:00:00.000Z', '2027-01-08T09:00:00.000Z'])
  })

  test('keeps local recurring times stable across daylight-saving transitions', () => {
    const occurrences = getOverviewMeetingOccurrences(meeting({ meetingType: 'recurring_fixed', recurrenceType: 'daily', timezone: 'America/New_York', startTime: '2026-10-30T13:00:00Z' }), new Date('2026-10-31T00:00:00Z'), 4)
    expect(occurrences.map((occurrence) => occurrence.date.toISOString())).toEqual(['2026-10-31T13:00:00.000Z', '2026-11-01T14:00:00.000Z', '2026-11-02T14:00:00.000Z'])
  })

  test('skips invalid monthly days instead of rolling them into the next month', () => {
    const occurrences = getOverviewMeetingOccurrences(meeting({ meetingType: 'recurring_fixed', recurrenceType: 'monthly', recurrenceDays: '31', startTime: '2026-01-31T13:00:00Z' }), new Date('2026-02-01T00:00:00Z'), 60)
    expect(occurrences.map((occurrence) => occurrence.date.toISOString())).toEqual(['2026-03-31T13:00:00.000Z'])
  })

  test('retains an ongoing one-off meeting, excludes its exact end, and keeps a distant future one-off', () => {
    expect(getOverviewMeetingOccurrences(meeting({ startTime: '2026-10-29T11:30:00Z' }), now)).toHaveLength(1)
    expect(getOverviewMeetingOccurrences(meeting({ startTime: '2026-10-29T11:00:00Z' }), now)).toEqual([])
    expect(getOverviewMeetingOccurrences(meeting({ startTime: '2027-01-01T11:00:00Z' }), now)).toHaveLength(1)
  })
})
