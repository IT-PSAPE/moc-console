import { describe, expect, test } from 'vitest'
import { deriveVenueBookingSeriesPhase } from '../../../../../packages/types/src/venues/phase'

const occurrences = [
  { index: 0, startsAt: '2026-09-01T10:00:00.000Z', endsAt: '2026-09-01T11:00:00.000Z' },
  { index: 1, startsAt: '2026-09-08T10:00:00.000Z', endsAt: '2026-09-08T11:00:00.000Z' },
]

describe('deriveVenueBookingSeriesPhase', () => {
  test('stays booked between occurrences and completes after the series', () => {
    expect(deriveVenueBookingSeriesPhase('auto', occurrences, new Date('2026-09-04T10:00:00.000Z'))).toBe('booked')
    expect(deriveVenueBookingSeriesPhase('auto', occurrences, new Date('2026-09-08T10:30:00.000Z'))).toBe('in_progress')
    expect(deriveVenueBookingSeriesPhase('auto', occurrences, new Date('2026-09-09T10:00:00.000Z'))).toBe('completed')
  })

  test('lets cancellation win over the clock', () => {
    expect(deriveVenueBookingSeriesPhase('cancelled', occurrences, new Date('2026-09-08T10:30:00.000Z'))).toBe('cancelled')
  })

  test('falls back to the stored booking window when slots are unavailable', () => {
    const fallback = { startsAt: '2026-09-08T10:00:00.000Z', endsAt: '2026-09-08T11:00:00.000Z' }
    expect(deriveVenueBookingSeriesPhase('auto', [], new Date('2026-09-08T10:30:00.000Z'), fallback)).toBe('in_progress')
    expect(deriveVenueBookingSeriesPhase('auto', [], new Date('2026-09-09T10:30:00.000Z'), fallback)).toBe('completed')
  })

  test('shows the approval decision before the clock takes over', () => {
    expect(deriveVenueBookingSeriesPhase('approved', occurrences, new Date('2026-08-30T10:00:00.000Z'))).toBe('approved')
    expect(deriveVenueBookingSeriesPhase('approved', occurrences, new Date('2026-09-01T10:30:00.000Z'))).toBe('in_progress')
    expect(deriveVenueBookingSeriesPhase('rejected', occurrences, new Date('2026-09-01T10:30:00.000Z'))).toBe('rejected')
  })
})
