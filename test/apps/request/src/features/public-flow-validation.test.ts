import { describe, expect, test } from 'bun:test'
import type { VenueBookingFormData } from '../../../../../apps/request/src/types/venue-booking'
import { getVenueBookingStepErrors } from '../../../../../apps/request/src/features/public-flow-validation'

const validVenueBooking: VenueBookingFormData = {
  requestedBy: 'A requester',
  venueId: 'venue-1',
  eventId: 'event-1',
  eventOther: '',
  bookingDate: '2026-10-05',
  slotStarts: ['2026-10-05T14:00:00.000Z'],
  recurrence: null,
}

describe('venue booking recurrence validation', () => {
  test('requires an ending choice for a repeated booking', () => {
    const errors = getVenueBookingStepErrors(1, {
      ...validVenueBooking,
      recurrence: { custom: false, frequency: 'day', interval: 1, weekdays: [], end: null },
    })

    expect(errors['recurrence-end']).toBe('Choose a valid end for the repeat pattern.')
  })

  test('requires a weekday for a weekly pattern', () => {
    const errors = getVenueBookingStepErrors(1, {
      ...validVenueBooking,
      recurrence: { custom: true, frequency: 'week', interval: 1, weekdays: [], end: { type: 'year_end' } },
    })

    expect(errors.recurrence).toBe('Choose a valid repeat pattern.')
  })

  test('rejects duplicate weekdays in a custom weekly pattern', () => {
    const errors = getVenueBookingStepErrors(1, {
      ...validVenueBooking,
      recurrence: { custom: true, frequency: 'week', interval: 1, weekdays: [1, 1], end: { type: 'year_end' } },
    })

    expect(errors.recurrence).toBe('Choose a valid repeat pattern.')
  })

  test('rejects an end date before the first booking', () => {
    const errors = getVenueBookingStepErrors(1, {
      ...validVenueBooking,
      recurrence: { custom: true, frequency: 'day', interval: 1, weekdays: [], end: { type: 'date', date: '2026-10-04' } },
    })

    expect(errors['recurrence-end']).toBe('Choose a valid end for the repeat pattern.')
  })
})
