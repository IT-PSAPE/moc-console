import { useReducer, useCallback } from 'react'
import { VENUE_SLOT_MINUTES } from '@moc/types/venues'
import { submitPublicVenueBooking } from '@/data/submit-venue-booking'
import { getVenueBookingStepErrors } from '@/features/public-flow-validation'
import { useStepValidation } from '@/features/hooks/use-step-validation'
import { formatCalendarDateKey } from '@/lib/utils'
import type { VenueBookingFormData, VenueBookingTextField, SubmitVenueBookingResult } from '@/types/venue-booking'

export type VenueBookingWindow = {
  startsAt: string
  endsAt: string
}

export type VenueBookingFormState = {
  step: number
  data: VenueBookingFormData
  submitting: boolean
  error: string | null
}

type VenueBookingFormAction =
  | { type: 'SET_FIELD'; field: VenueBookingTextField; value: string }
  | { type: 'SET_VENUE'; venueId: string }
  | { type: 'SET_BOOKING_DATE'; bookingDate: string }
  | { type: 'SET_SLOTS'; slotStarts: string[] }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; error: string }

const initialData: VenueBookingFormData = {
  title: '',
  requestedBy: '',
  who: '',
  what: '',
  whenText: '',
  whereText: '',
  why: '',
  how: '',
  notes: '',
  venueId: '',
  bookingDate: '',
  slotStarts: [],
}

// The booked window is derived from the selected (contiguous, chronological)
// slots rather than stored — it mirrors what public_submit_venue_booking
// itself computes (starts_at / ends_at) from the same slot_starts array.
function deriveBookingWindow(slotStarts: string[]): VenueBookingWindow | null {
  if (slotStarts.length === 0) return null

  const startsAt = slotStarts[0]
  const lastSlotStart = new Date(slotStarts[slotStarts.length - 1])
  const endsAt = new Date(lastSlotStart.getTime() + VENUE_SLOT_MINUTES * 60_000).toISOString()

  return { startsAt, endsAt }
}

function reducer(state: VenueBookingFormState, action: VenueBookingFormAction): VenueBookingFormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, data: { ...state.data, [action.field]: action.value } }
    case 'SET_VENUE':
      return { ...state, data: { ...state.data, venueId: action.venueId, slotStarts: [] } }
    case 'SET_BOOKING_DATE':
      return { ...state, data: { ...state.data, bookingDate: action.bookingDate, slotStarts: [] } }
    case 'SET_SLOTS':
      return { ...state, data: { ...state.data, slotStarts: action.slotStarts } }
    case 'NEXT_STEP':
      return { ...state, step: Math.min(state.step + 1, 3) }
    case 'PREV_STEP':
      return { ...state, step: Math.max(state.step - 1, 1) }
    case 'SUBMIT_START':
      return { ...state, submitting: true, error: null }
    case 'SUBMIT_SUCCESS':
      return { ...state, submitting: false }
    case 'SUBMIT_ERROR':
      return { ...state, submitting: false, error: action.error }
  }
}

const errorIdByField: Partial<Record<VenueBookingTextField, string>> = {
  title: 'title',
  requestedBy: 'requested-by',
  who: 'who',
  what: 'what',
  whenText: 'when-text',
  whereText: 'where-text',
  why: 'why',
  how: 'how',
}

export function useVenueBookingForm() {
  const [state, dispatch] = useReducer(reducer, {
    step: 1,
    data: initialData,
    submitting: false,
    error: null,
  })
  const validation = useStepValidation()
  const { errors: validationErrors } = validation.state
  const { clearError, validate } = validation.actions

  const setField = useCallback((field: VenueBookingTextField, value: string) => {
    dispatch({ type: 'SET_FIELD', field, value })
    const errorId = errorIdByField[field]
    if (errorId) clearError(errorId)
  }, [clearError])

  const setVenue = useCallback((venueId: string) => {
    dispatch({ type: 'SET_VENUE', venueId })
    clearError('venue')
    clearError('venue-slots')
  }, [clearError])

  const setBookingDate = useCallback((date: Date) => {
    dispatch({ type: 'SET_BOOKING_DATE', bookingDate: formatCalendarDateKey(date) })
    clearError('venue-slots')
  }, [clearError])

  const setSlots = useCallback((slotStarts: string[]) => {
    dispatch({ type: 'SET_SLOTS', slotStarts })
    clearError('venue-slots')
  }, [clearError])

  const nextStep = useCallback(() => {
    dispatch({ type: 'NEXT_STEP' })
  }, [])

  const prevStep = useCallback(() => {
    dispatch({ type: 'PREV_STEP' })
  }, [])

  const validateCurrentStep = useCallback(() => {
    return validate(getVenueBookingStepErrors(state.step, state.data))
  }, [state.step, state.data, validate])

  const submit = useCallback(async (): Promise<SubmitVenueBookingResult | null> => {
    dispatch({ type: 'SUBMIT_START' })
    try {
      const result = await submitPublicVenueBooking(state.data)
      dispatch({ type: 'SUBMIT_SUCCESS' })
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit venue booking'
      dispatch({ type: 'SUBMIT_ERROR', error: message })
      return null
    }
  }, [state.data])

  return {
    state: { ...state, validationErrors, bookingWindow: deriveBookingWindow(state.data.slotStarts) },
    actions: { setField, setVenue, setBookingDate, setSlots, nextStep, prevStep, submit, validateCurrentStep },
  }
}
