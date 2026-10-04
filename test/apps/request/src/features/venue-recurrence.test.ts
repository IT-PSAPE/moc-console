import { describe, expect, test } from 'vitest'
import { createVenueRecurrence, inferVenueRecurrencePreset, reduceVenueRecurrence, updateVenueRecurrenceForDate, venueRecurrencePresetItems } from '../../../../../apps/request/src/features/venue-recurrence'

describe('venue recurrence state', () => {
  test('creates the supported preset rules', () => {
    expect(createVenueRecurrence('none', '2026-09-28')).toBeNull()
    expect(createVenueRecurrence('daily', '2026-09-28')?.frequency).toBe('day')
    expect(createVenueRecurrence('weekdays', '2026-09-28')?.weekdays).toEqual([1, 2, 3, 4, 5])
    expect(createVenueRecurrence('weekly', '2026-09-28')?.weekdays).toEqual([1])
    expect(createVenueRecurrence('monthly', '2026-09-28')?.frequency).toBe('month')
    expect(createVenueRecurrence('monthly', '2026-09-28')?.end).toBeNull()
    expect(venueRecurrencePresetItems.map((item) => item.value)).not.toContain('yearly')
  })

  test('keeps a weekly preset aligned when the first date changes', () => {
    const weekly = createVenueRecurrence('weekly', '2026-09-28')
    expect(updateVenueRecurrenceForDate(weekly, '2026-09-28', '2026-09-30')?.weekdays).toEqual([3])
  })

  test('supports custom weekdays and bounded endings', () => {
    let value = createVenueRecurrence('custom', '2026-09-28')
    value = reduceVenueRecurrence(value, { type: 'weekday', weekday: 3 }, '2026-09-28')
    value = reduceVenueRecurrence(value, { type: 'interval', interval: 2 }, '2026-09-28')
    value = reduceVenueRecurrence(value, { type: 'end-type', endType: 'count' }, '2026-09-28')
    value = reduceVenueRecurrence(value, { type: 'end-count', count: 13 }, '2026-09-28')

    expect(inferVenueRecurrencePreset(value)).toBe('custom')
    expect(value).toEqual({ custom: true, frequency: 'week', interval: 2, weekdays: [1, 3], end: { type: 'count', count: 13 } })
  })
})
