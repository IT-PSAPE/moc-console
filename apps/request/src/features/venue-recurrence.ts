import type { VenueRecurrence, VenueRecurrenceEnd, VenueRecurrenceFrequency } from '@moc/types/venues'

export type VenueRecurrencePreset = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'custom'

export type VenueRecurrenceAction =
  | { type: 'preset'; preset: VenueRecurrencePreset }
  | { type: 'frequency'; frequency: VenueRecurrenceFrequency }
  | { type: 'interval'; interval: number }
  | { type: 'weekday'; weekday: number }
  | { type: 'end-type'; endType: VenueRecurrenceEnd['type'] }
  | { type: 'end-date'; date: string }
  | { type: 'end-count'; count: number }

export const venueRecurrencePresetItems: Array<{ label: string; value: VenueRecurrencePreset }> = [
  { label: 'Does not repeat', value: 'none' },
  { label: 'Daily', value: 'daily' },
  { label: 'Every weekday', value: 'weekdays' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Custom…', value: 'custom' },
]

function isoWeekday(dateKey: string): number {
  const date = new Date(`${dateKey}T12:00:00`)
  const day = date.getDay()
  return day === 0 ? 7 : day
}

function recurrence(frequency: VenueRecurrenceFrequency, weekdays: number[] = [], custom = false): VenueRecurrence {
  return { custom, frequency, interval: 1, weekdays, end: null }
}

export function createVenueRecurrence(preset: VenueRecurrencePreset, bookingDate: string): VenueRecurrence | null {
  if (preset === 'none') return null
  if (preset === 'daily') return recurrence('day')
  if (preset === 'weekdays') return recurrence('week', [1, 2, 3, 4, 5])
  if (preset === 'monthly') return recurrence('month')
  return recurrence('week', [isoWeekday(bookingDate)], preset === 'custom')
}

export function inferVenueRecurrencePreset(value: VenueRecurrence | null): VenueRecurrencePreset {
  if (!value) return 'none'
  if (value.custom) return 'custom'
  if (value.interval !== 1) return 'custom'
  if (value.frequency === 'day') return 'daily'
  if (value.frequency === 'month') return 'monthly'
  if (value.weekdays.join(',') === '1,2,3,4,5') return 'weekdays'
  if (value.weekdays.length === 1) return 'weekly'
  return 'custom'
}

export function updateVenueRecurrenceFrequency(value: VenueRecurrence, frequency: VenueRecurrenceFrequency, bookingDate: string): VenueRecurrence {
  return { ...value, frequency, weekdays: frequency === 'week' ? (value.weekdays.length > 0 ? value.weekdays : [isoWeekday(bookingDate)]) : [] }
}

export function updateVenueRecurrenceEnd(value: VenueRecurrence, end: VenueRecurrenceEnd): VenueRecurrence {
  return { ...value, end }
}

export function updateVenueRecurrenceForDate(value: VenueRecurrence | null, previousDate: string, nextDate: string): VenueRecurrence | null {
  if (!value || value.frequency !== 'week' || value.weekdays.length !== 1 || value.weekdays[0] !== isoWeekday(previousDate)) return value
  return { ...value, weekdays: [isoWeekday(nextDate)] }
}

export function reduceVenueRecurrence(value: VenueRecurrence | null, action: VenueRecurrenceAction, bookingDate: string): VenueRecurrence | null {
  if (action.type === 'preset') return createVenueRecurrence(action.preset, bookingDate)
  const current = value ?? createVenueRecurrence('custom', bookingDate)
  if (!current) return null
  if (action.type === 'frequency') return updateVenueRecurrenceFrequency(current, action.frequency, bookingDate)
  if (action.type === 'interval') return { ...current, interval: Math.min(365, Math.max(1, action.interval)) }
  if (action.type === 'weekday') {
    const selected = current.weekdays.includes(action.weekday)
      ? current.weekdays.filter((weekday) => weekday !== action.weekday)
      : [...current.weekdays, action.weekday].sort((left, right) => left - right)
    return { ...current, weekdays: selected }
  }
  if (action.type === 'end-type') {
    if (action.endType === 'date') return updateVenueRecurrenceEnd(current, { type: 'date', date: bookingDate })
    if (action.endType === 'count') return updateVenueRecurrenceEnd(current, { type: 'count', count: 2 })
    return updateVenueRecurrenceEnd(current, { type: 'year_end' })
  }
  if (action.type === 'end-date') return updateVenueRecurrenceEnd(current, { type: 'date', date: action.date })
  return updateVenueRecurrenceEnd(current, { type: 'count', count: Math.min(366, Math.max(2, action.count)) })
}
