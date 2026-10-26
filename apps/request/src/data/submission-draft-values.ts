import { formatCalendarDateKey } from '../lib/utils'
import type { BookingFormData } from '../types/booking'
import type { RequestFormData } from '../types/request'
import type { VenueBookingFormData } from '../types/venue-booking'

const EMPTY_REQUEST_DRAFT: RequestFormData = {
  title: '',
  requestedBy: '',
  dueDate: '',
  category: '',
  who: '',
  what: '',
  whenText: '',
  whereText: '',
  why: '',
  how: '',
  flow: '',
}

const EMPTY_BOOKING_DRAFT: BookingFormData = {
  title: '',
  equipmentIds: [],
  requestedEquipment: [],
  otherEquipment: '',
  bookedBy: '',
  checkedOutAt: '',
  expectedReturnAt: '',
}

export const requestTextFields: Array<Exclude<keyof RequestFormData, 'category'>> = [
  'title', 'requestedBy', 'dueDate', 'who', 'what', 'whenText', 'whereText', 'why', 'how', 'flow',
]

export const bookingTextFields: Array<Exclude<keyof BookingFormData, 'equipmentIds' | 'requestedEquipment'>> = [
  'title', 'otherEquipment', 'bookedBy', 'checkedOutAt', 'expectedReturnAt',
]

function hasText(value: string): boolean {
  return value.trim().length > 0
}

export function getEmptyRequestDraft(): RequestFormData {
  return { ...EMPTY_REQUEST_DRAFT }
}

export function getEmptyBookingDraft(): BookingFormData {
  return { ...EMPTY_BOOKING_DRAFT, equipmentIds: [], requestedEquipment: [] }
}

export function restoreRequestDraft(data: RequestFormData): RequestFormData {
  const legacyNotes = 'notes' in data && typeof data.notes === 'string' ? data.notes : ''
  return {
    title: data.title, requestedBy: data.requestedBy, dueDate: data.dueDate, category: data.category,
    who: data.who, what: legacyNotes.trim() ? [data.what, legacyNotes].filter(Boolean).join('\n\n') : data.what,
    whenText: data.whenText, whereText: data.whereText, why: data.why, how: data.how, flow: data.flow,
  }
}

export function restoreBookingDraft(data: BookingFormData): BookingFormData {
  return {
    title: data.title, equipmentIds: data.equipmentIds, requestedEquipment: data.requestedEquipment,
    otherEquipment: data.otherEquipment, bookedBy: data.bookedBy,
    checkedOutAt: data.checkedOutAt, expectedReturnAt: data.expectedReturnAt,
  }
}

export function getEmptyVenueBookingDraft(bookingDate = formatCalendarDateKey(new Date())): VenueBookingFormData {
  return { requestedBy: '', venueId: '', eventId: '', eventOther: '', bookingDate, slotStarts: [], recurrence: null }
}

export function hasMeaningfulRequestDraft(data: RequestFormData, defaultCategory: string): boolean {
  const hasCategoryChange = hasText(data.category) && data.category !== defaultCategory
  return hasCategoryChange
    || requestTextFields.some((field) => hasText(data[field]))
}

export function hasMeaningfulBookingDraft(data: BookingFormData): boolean {
  return data.equipmentIds.length > 0
    || data.requestedEquipment.length > 0
    || bookingTextFields.some((field) => hasText(data[field]))
}

export function hasMeaningfulVenueBookingDraft(data: VenueBookingFormData, initialData: VenueBookingFormData): boolean {
  return hasText(data.requestedBy)
    || data.venueId !== initialData.venueId
    || data.eventId !== initialData.eventId
    || hasText(data.eventOther)
    || data.bookingDate !== initialData.bookingDate
    || data.slotStarts.length > 0
    || data.recurrence !== null
}
