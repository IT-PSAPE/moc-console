import { expect, test } from 'vitest'
import { getCalendarView } from '../../../../../apps/console/src/features/preferences/calendar-view-options'

test('fresh and invalid Work links use the personal default', () => {
  expect(getCalendarView(null, 'week')).toBe('week')
  expect(getCalendarView(null, 'agenda')).toBe('agenda')
  expect(getCalendarView('invalid', 'day')).toBe('day')
})

test('explicit Work links override the default without changing it', () => {
  expect(getCalendarView('month', 'agenda')).toBe('month')
  expect(getCalendarView(null, 'agenda')).toBe('agenda')
})
