import { describe, expect, test } from 'bun:test'
import { mapVenueBookingRow, type VenueBookingRow } from './map-venue-booking'

function row(): VenueBookingRow {
  return {
    id: 'booking', workspace_id: 'workspace', venue_id: 'venue', event_id: 'event', event_other: null,
    tracking_code: 'VEN-ABC123', title: 'Rehearsal', requested_by: 'Craig', notes: null, status: 'auto',
    starts_at: '2026-09-01T10:00:00.000Z', ends_at: '2026-09-01T11:00:00.000Z',
    recurrence: { custom: false, frequency: 'week', interval: 1, weekdays: [2], end: { type: 'count', count: 2 } },
    cancelled_at: null, cancelled_by: null, cancel_reason: null,
    created_at: '2026-08-01T10:00:00.000Z', updated_at: '2026-08-01T10:00:00.000Z',
    venue: { name: 'Hall', location: null }, event: { name: 'Rehearsal' }, canceller: null,
    slots: [
      { occurrence_index: 1, slot_start: '2026-09-08T10:30:00.000Z', slot_end: '2026-09-08T11:00:00.000Z' },
      { occurrence_index: 0, slot_start: '2026-09-01T10:00:00.000Z', slot_end: '2026-09-01T10:30:00.000Z' },
      { occurrence_index: 1, slot_start: '2026-09-08T10:00:00.000Z', slot_end: '2026-09-08T10:30:00.000Z' },
      { occurrence_index: 0, slot_start: '2026-09-01T10:30:00.000Z', slot_end: '2026-09-01T11:00:00.000Z' },
    ],
  }
}

describe('mapVenueBookingRow', () => {
  test('groups materialized slots into ordered occurrences', () => {
    expect(mapVenueBookingRow(row()).occurrences).toEqual([
      { index: 0, startsAt: '2026-09-01T10:00:00.000Z', endsAt: '2026-09-01T11:00:00.000Z' },
      { index: 1, startsAt: '2026-09-08T10:00:00.000Z', endsAt: '2026-09-08T11:00:00.000Z' },
    ])
  })
})
