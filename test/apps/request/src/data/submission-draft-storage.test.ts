import { afterAll, beforeEach, describe, expect, test } from 'vitest'
import {
  getEmptyBookingDraft,
  getEmptyRequestDraft,
  getEmptyVenueBookingDraft,
  hasMeaningfulBookingDraft,
  hasMeaningfulRequestDraft,
  hasMeaningfulVenueBookingDraft,
  loadSubmissionDraft,
  saveSubmissionDraft,
} from '../../../../../apps/request/src/data/submission-draft-storage'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()

  get length(): number {
    return this.values.size
  }

  clear(): void {
    this.values.clear()
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')
const storage = new MemoryStorage()

Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: { localStorage: storage },
})

beforeEach(() => {
  storage.clear()
})

afterAll(() => {
  if (originalWindowDescriptor) {
    Object.defineProperty(globalThis, 'window', originalWindowDescriptor)
  } else {
    Reflect.deleteProperty(globalThis, 'window')
  }
})

describe('meaningful submission drafts', () => {
  test('does not treat request defaults, automatic category selection, or whitespace as progress', () => {
    const data = { ...getEmptyRequestDraft(), category: 'production', title: '   ' }

    expect(hasMeaningfulRequestDraft(data, 'production')).toBe(false)
    expect(hasMeaningfulRequestDraft({ ...data, title: 'Sunday service' }, 'production')).toBe(true)
  })

  test('removes equipment booking progress when selections and text return to defaults', () => {
    const empty = getEmptyBookingDraft()

    expect(hasMeaningfulBookingDraft(empty)).toBe(false)
    expect(hasMeaningfulBookingDraft({ ...empty, requestedEquipment: ['Camera'] })).toBe(true)
    expect(hasMeaningfulBookingDraft({ ...empty, otherEquipment: '   ' })).toBe(false)
  })

  test('compares venue booking progress with the date initially shown to the user', () => {
    const empty = getEmptyVenueBookingDraft('2026-09-26')

    expect(hasMeaningfulVenueBookingDraft(empty, empty)).toBe(false)
    expect(hasMeaningfulVenueBookingDraft({ ...empty, venueId: 'main-hall' }, empty)).toBe(true)
    expect(hasMeaningfulVenueBookingDraft({ ...empty, bookingDate: '2026-09-27' }, empty)).toBe(true)
    expect(hasMeaningfulVenueBookingDraft({ ...empty, recurrence: { custom: false, frequency: 'day', interval: 1, weekdays: [], end: { type: 'count', count: 2 } } }, empty)).toBe(true)
  })
})

describe('submission draft storage', () => {
  test('stores each flow independently and clears only the flow returned to defaults', () => {
    const requestData = { ...getEmptyRequestDraft(), title: 'Sunday service' }
    const bookingData = { ...getEmptyBookingDraft(), requestedEquipment: ['Camera'] }

    saveSubmissionDraft('request', { step: 2, data: requestData }, true)
    saveSubmissionDraft('booking', { step: 2, data: bookingData }, true)
    saveSubmissionDraft('request', { step: 1, data: getEmptyRequestDraft() }, false)

    expect(loadSubmissionDraft('request')).toBeNull()
    expect(loadSubmissionDraft('booking')).toEqual({ step: 2, data: bookingData })
    expect(loadSubmissionDraft('venue')).toBeNull()
  })

  test('restores current request fields while discarding fields from older drafts', () => {
    const currentData = { ...getEmptyRequestDraft(), title: 'Sunday service', category: 'production' }
    storage.setItem('moc-request-public-draft-request-v2', JSON.stringify({
      step: 3,
      data: { ...currentData, priority: 'urgent' },
    }))

    const restored = loadSubmissionDraft('request')

    expect(restored).toEqual({ step: 3, data: currentData })
    expect(restored?.data).not.toHaveProperty('priority')
  })

  test('preserves unsent legacy request notes as context without restoring a notes field', () => {
    const currentData = { ...getEmptyRequestDraft(), title: 'Sunday service', what: 'Record the service' }
    storage.setItem('moc-request-public-draft-request-v2', JSON.stringify({
      step: 2,
      data: { ...currentData, notes: 'Use the side entrance\nAsk for Craig' },
    }))

    const restored = loadSubmissionDraft('request')

    expect(restored?.data.what).toBe('Record the service\n\nUse the side entrance\nAsk for Craig')
    expect(restored?.data).not.toHaveProperty('notes')
    expect(restored).not.toBeNull()
    if (!restored) throw new Error('Expected request draft')
    saveSubmissionDraft('request', restored, true)
    expect(loadSubmissionDraft('request')).toEqual(restored)
  })

  test('retains the original booking draft before removing legacy notes from the form', () => {
    const currentData = { ...getEmptyBookingDraft(), title: 'Sunday setup', requestedEquipment: ['Camera'] }
    const original = JSON.stringify({ step: 2, data: { ...currentData, notes: 'Collect at the side entrance\nAsk for Craig' } })
    storage.setItem('moc-request-public-draft-booking-v2', original)

    const restored = loadSubmissionDraft('booking')

    expect(restored).toEqual({ step: 2, data: currentData })
    expect(restored?.data).not.toHaveProperty('notes')
    expect(storage.getItem('moc-request-public-draft-booking-v2-legacy')).toBe(original)
    if (!restored) throw new Error('Expected booking draft')
    saveSubmissionDraft('booking', restored, true)
    expect(loadSubmissionDraft('booking')).toEqual(restored)
    expect(storage.getItem('moc-request-public-draft-booking-v2-legacy')).toBe(original)
  })

  test('rejects malformed recurrence rules instead of restoring an unusable draft', () => {
    const data = {
      ...getEmptyVenueBookingDraft('2026-09-26'),
      recurrence: { custom: true, frequency: 'week', interval: 1, weekdays: [1, 1], end: { type: 'count', count: 1 } },
    }
    storage.setItem('moc-request-public-draft-venue-v2', JSON.stringify({ step: 1, data }))

    expect(loadSubmissionDraft('venue')).toBeNull()
  })
})
