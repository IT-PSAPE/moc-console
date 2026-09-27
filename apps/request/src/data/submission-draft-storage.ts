import { bookingTextFields, requestTextFields } from './submission-draft-values'
import type { BookingFormData } from '../types/booking'
import type { RequestFormData } from '../types/request'
import type { VenueBookingFormData } from '../types/venue-booking'

export {
  getEmptyBookingDraft,
  getEmptyRequestDraft,
  getEmptyVenueBookingDraft,
  hasMeaningfulBookingDraft,
  hasMeaningfulRequestDraft,
  hasMeaningfulVenueBookingDraft,
} from './submission-draft-values'

export type SubmissionDraftKind = 'request' | 'booking' | 'venue'

type SubmissionDraftData = {
  request: RequestFormData
  booking: BookingFormData
  venue: VenueBookingFormData
}

export type StoredSubmissionDraft<K extends SubmissionDraftKind> = {
  step: number
  data: SubmissionDraftData[K]
}

type AnyStoredSubmissionDraft =
  | StoredSubmissionDraft<'request'>
  | StoredSubmissionDraft<'booking'>
  | StoredSubmissionDraft<'venue'>

const STORAGE_KEYS: Record<SubmissionDraftKind, string> = {
  request: 'moc-request-public-draft-request-v2',
  booking: 'moc-request-public-draft-booking-v2',
  venue: 'moc-request-public-draft-venue-v2',
}

const LEGACY_REQUEST_DRAFT_KEY = 'moc-request-public-draft-v1'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isVenueRecurrence(value: unknown): boolean {
  if (!isRecord(value)) return false
  if (typeof value.custom !== 'boolean') return false
  if (!['day', 'week', 'month'].includes(String(value.frequency))) return false
  if (!Number.isInteger(value.interval) || Number(value.interval) < 1 || Number(value.interval) > 365) return false
  if (!Array.isArray(value.weekdays) || value.weekdays.length > 7 || !value.weekdays.every((day) => Number.isInteger(day) && day >= 1 && day <= 7)) return false
  if (new Set(value.weekdays).size !== value.weekdays.length || (value.frequency === 'week' && value.weekdays.length === 0)) return false
  if (value.end === null) return false
  if (!isRecord(value.end) || !['year_end', 'date', 'count'].includes(String(value.end.type))) return false
  if (value.end.type === 'date') return typeof value.end.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.end.date)
  if (value.end.type === 'count') return Number.isInteger(value.end.count) && Number(value.end.count) >= 2 && Number(value.end.count) <= 366
  return true
}

function isRequestFormData(value: unknown): value is RequestFormData {
  if (!isRecord(value)) return false

  return requestTextFields.every((field) => typeof value[field] === 'string')
    && typeof value.priority === 'string'
    && typeof value.category === 'string'
}

function isBookingFormData(value: unknown): value is BookingFormData {
  if (!isRecord(value)) return false

  return bookingTextFields.every((field) => typeof value[field] === 'string')
    && isStringArray(value.equipmentIds)
    && isStringArray(value.requestedEquipment)
}

function isVenueBookingFormData(value: unknown): value is VenueBookingFormData {
  if (!isRecord(value)) return false

  return typeof value.requestedBy === 'string'
    && typeof value.venueId === 'string'
    && typeof value.eventId === 'string'
    && typeof value.eventOther === 'string'
    && typeof value.bookingDate === 'string'
    && isStringArray(value.slotStarts)
    && (value.recurrence === undefined || value.recurrence === null || isVenueRecurrence(value.recurrence))
}

function readStoredValue(kind: SubmissionDraftKind): unknown {
  const raw = window.localStorage.getItem(STORAGE_KEYS[kind])
  return raw ? JSON.parse(raw) : null
}

function isDraftEnvelope(value: unknown): value is { step: number; data: unknown } {
  return isRecord(value) && Number.isInteger(value.step) && Number(value.step) >= 1 && 'data' in value
}

export function loadSubmissionDraft(kind: 'request'): StoredSubmissionDraft<'request'> | null
export function loadSubmissionDraft(kind: 'booking'): StoredSubmissionDraft<'booking'> | null
export function loadSubmissionDraft(kind: 'venue'): StoredSubmissionDraft<'venue'> | null
export function loadSubmissionDraft(kind: SubmissionDraftKind): AnyStoredSubmissionDraft | null
export function loadSubmissionDraft(kind: SubmissionDraftKind): AnyStoredSubmissionDraft | null {
  try {
    const value = readStoredValue(kind)
    if (!isDraftEnvelope(value)) return null

    if (kind === 'request' && isRequestFormData(value.data)) return { step: value.step, data: value.data }
    if (kind === 'booking' && isBookingFormData(value.data)) return { step: value.step, data: value.data }
    if (kind === 'venue' && isVenueBookingFormData(value.data)) return { step: value.step, data: { ...value.data, recurrence: value.data.recurrence ?? null } }
    return null
  } catch {
    return null
  }
}

export function saveSubmissionDraft<K extends SubmissionDraftKind>(kind: K, draft: StoredSubmissionDraft<K>, hasMeaningfulChanges: boolean): void {
  if (!hasMeaningfulChanges) {
    clearSubmissionDraft(kind)
    return
  }

  try {
    window.localStorage.setItem(STORAGE_KEYS[kind], JSON.stringify(draft))
  } catch {
    // Draft persistence is optional; the submission flow remains usable.
  }
}

export function clearSubmissionDraft(kind: SubmissionDraftKind): void {
  try {
    window.localStorage.removeItem(STORAGE_KEYS[kind])
    if (kind === 'request') window.localStorage.removeItem(LEGACY_REQUEST_DRAFT_KEY)
  } catch {
    // No recovery is possible when browser storage is unavailable.
  }
}
