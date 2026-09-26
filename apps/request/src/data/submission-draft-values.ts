import { formatCalendarDateKey } from '../lib/utils'
import type { BookingFormData } from '../types/booking'
import type { RequestFormData } from '../types/request'
import type { VenueBookingFormData } from '../types/venue-booking'

const EMPTY_REQUEST_DRAFT: RequestFormData = {
  title: '',
  requestedBy: '',
  priority: 'medium',
  dueDate: '',
  category: '',
  who: '',
  what: '',
  whenText: '',
  whereText: '',
  why: '',
  how: '',
  notes: '',
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
  notes: '',
}

export const requestTextFields: Array<Exclude<keyof RequestFormData, 'priority' | 'category'>> = [
  'title', 'requestedBy', 'dueDate', 'who', 'what', 'whenText', 'whereText', 'why', 'how', 'notes', 'flow',
]

export const bookingTextFields: Array<Exclude<keyof BookingFormData, 'equipmentIds' | 'requestedEquipment'>> = [
  'title', 'otherEquipment', 'bookedBy', 'checkedOutAt', 'expectedReturnAt', 'notes',
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

export function getEmptyVenueBookingDraft(bookingDate = formatCalendarDateKey(new Date())): VenueBookingFormData {
  return { requestedBy: '', venueId: '', eventId: '', eventOther: '', bookingDate, slotStarts: [] }
}

export function hasMeaningfulRequestDraft(data: RequestFormData, defaultCategory: string): boolean {
  const hasCategoryChange = hasText(data.category) && data.category !== defaultCategory
  return data.priority !== EMPTY_REQUEST_DRAFT.priority
    || hasCategoryChange
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
}
