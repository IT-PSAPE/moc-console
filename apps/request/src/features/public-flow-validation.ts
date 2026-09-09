import type { StepValidationErrors } from '@/features/hooks/use-step-validation'
import type { BookingFormData } from '@/types/booking'
import type { RequestFormData } from '@/types/request'
import type { VenueBookingFormData } from '@/types/venue-booking'

function getRequiredTextError(value: string, message: string): string | undefined {
  return value.trim() ? undefined : message
}

export function isReturnBeforeCheckout(data: BookingFormData): boolean {
  if (!data.checkedOutAt || !data.expectedReturnAt) return false
  return new Date(data.expectedReturnAt) <= new Date(data.checkedOutAt)
}

export function getRequestStepErrors(step: number, data: RequestFormData): StepValidationErrors {
  if (step === 1) {
    const titleError = getRequiredTextError(data.title, 'Enter a request title.')
    const requestedByError = getRequiredTextError(data.requestedBy, 'Enter the requester’s name.')

    return {
      ...(titleError ? { title: titleError } : {}),
      ...(requestedByError ? { 'requested-by': requestedByError } : {}),
      ...(!data.dueDate ? { 'due-date-date': 'Enter a due date and time.' } : {}),
    }
  }

  if (step === 2) {
    const whoError = getRequiredTextError(data.who, 'Enter who is involved or responsible.')
    const whatError = getRequiredTextError(data.what, 'Enter what needs to be done.')
    const whenError = getRequiredTextError(data.whenText, 'Enter when this needs to happen.')
    const whereError = getRequiredTextError(data.whereText, 'Enter where this will take place.')
    const whyError = getRequiredTextError(data.why, 'Enter why this is needed.')
    const howError = getRequiredTextError(data.how, 'Enter how this should be executed.')

    return {
      ...(whoError ? { who: whoError } : {}),
      ...(whatError ? { what: whatError } : {}),
      ...(whenError ? { 'when-text': whenError } : {}),
      ...(whereError ? { 'where-text': whereError } : {}),
      ...(whyError ? { why: whyError } : {}),
      ...(howError ? { how: howError } : {}),
    }
  }

  return {}
}

export function getBookingStepErrors(step: number, data: BookingFormData): StepValidationErrors {
  if (step === 1) {
    const titleError = getRequiredTextError(data.title, 'Enter a booking title.')
    const bookedByError = getRequiredTextError(data.bookedBy, 'Enter the person booking this equipment.')

    return {
      ...(titleError ? { title: titleError } : {}),
      ...(data.title.length > 120 ? { title: 'Keep the title to 120 characters or fewer.' } : {}),
      ...(bookedByError ? { 'booked-by': bookedByError } : {}),
      ...(!data.checkedOutAt ? { 'checkout-date': 'Enter a checkout date and time.' } : {}),
      ...(!data.expectedReturnAt ? { 'expected-return-date': 'Enter an expected return date and time.' } : {}),
      ...(isReturnBeforeCheckout(data) ? { 'expected-return-date': 'Expected return must be after checkout.' } : {}),
    }
  }

  if (step === 2 && data.requestedEquipment.length === 0 && !data.otherEquipment.trim()) {
    return { 'booking-equipment': 'Choose equipment or describe other equipment.' }
  }

  return {}
}

export function getVenueBookingStepErrors(step: number, data: VenueBookingFormData): StepValidationErrors {
  if (step === 1) {
    const titleError = getRequiredTextError(data.title, 'Enter a booking title.')
    const requestedByError = getRequiredTextError(data.requestedBy, 'Enter the requester’s name.')
    const whoError = getRequiredTextError(data.who, 'Enter who is involved or responsible.')
    const whatError = getRequiredTextError(data.what, 'Enter what needs to be done.')
    const whenError = getRequiredTextError(data.whenText, 'Enter when this needs to happen.')
    const whereError = getRequiredTextError(data.whereText, 'Enter where this will take place.')
    const whyError = getRequiredTextError(data.why, 'Enter why this is needed.')
    const howError = getRequiredTextError(data.how, 'Enter how this should be executed.')

    return {
      ...(titleError ? { title: titleError } : {}),
      ...(requestedByError ? { 'requested-by': requestedByError } : {}),
      ...(whoError ? { who: whoError } : {}),
      ...(whatError ? { what: whatError } : {}),
      ...(whenError ? { 'when-text': whenError } : {}),
      ...(whereError ? { 'where-text': whereError } : {}),
      ...(whyError ? { why: whyError } : {}),
      ...(howError ? { how: howError } : {}),
    }
  }

  if (step === 2) {
    return {
      ...(!data.venueId ? { venue: 'Choose a venue.' } : {}),
      ...(data.slotStarts.length === 0 ? { 'venue-slots': 'Choose at least one time slot.' } : {}),
    }
  }

  return {}
}
