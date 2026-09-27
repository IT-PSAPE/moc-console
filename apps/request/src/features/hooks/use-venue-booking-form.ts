import { useReducer, useCallback, useEffect, useState } from 'react'
import { VENUE_SLOT_MINUTES, VENUE_EVENT_OTHER_ID } from '@moc/types/venues'
import { submitPublicVenueBooking } from '@/data/submit-venue-booking'
import { clearSubmissionDraft, getEmptyVenueBookingDraft, hasMeaningfulVenueBookingDraft, loadSubmissionDraft, saveSubmissionDraft } from '@/data/submission-draft-storage'
import { getVenueBookingStepErrors } from '@/features/public-flow-validation'
import { useStepValidation } from '@/features/hooks/use-step-validation'
import { reduceVenueRecurrence, updateVenueRecurrenceForDate, type VenueRecurrenceAction } from '@/features/venue-recurrence'
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
  | { type: 'SET_EVENT'; eventId: string }
  | { type: 'SET_BOOKING_DATE'; bookingDate: string }
  | { type: 'SET_SLOTS'; slotStarts: string[] }
  | { type: 'SET_RECURRENCE'; action: VenueRecurrenceAction }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; error: string }

const LAST_STEP = 2

function getInitialState(initialData: VenueBookingFormData): VenueBookingFormState {
  const savedDraft = loadSubmissionDraft('venue')
  return savedDraft
    ? { ...savedDraft, submitting: false, error: null }
    : { step: 1, data: initialData, submitting: false, error: null }
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
    case 'SET_EVENT':
      // Moving off "Other" drops the description that only belonged to it.
      return {
        ...state,
        data: {
          ...state.data,
          eventId: action.eventId,
          eventOther: action.eventId === VENUE_EVENT_OTHER_ID ? state.data.eventOther : '',
        },
      }
    case 'SET_BOOKING_DATE':
      return { ...state, data: { ...state.data, bookingDate: action.bookingDate, slotStarts: [], recurrence: updateVenueRecurrenceForDate(state.data.recurrence, state.data.bookingDate, action.bookingDate) } }
    case 'SET_SLOTS':
      return { ...state, data: { ...state.data, slotStarts: action.slotStarts } }
    case 'SET_RECURRENCE':
      return { ...state, data: { ...state.data, recurrence: reduceVenueRecurrence(state.data.recurrence, action.action, state.data.bookingDate) } }
    case 'NEXT_STEP':
      return { ...state, step: Math.min(state.step + 1, LAST_STEP) }
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

const errorIdByField: Record<VenueBookingTextField, string> = {
  requestedBy: 'requested-by',
  eventOther: 'event-other',
}

export function useVenueBookingForm() {
  const [initialData] = useState<VenueBookingFormData>(getEmptyVenueBookingDraft)
  const [state, dispatch] = useReducer(reducer, initialData, getInitialState)
  const validation = useStepValidation()
  const { errors: validationErrors } = validation.state
  const { clearError, validate } = validation.actions

  useEffect(() => {
    saveSubmissionDraft('venue', { step: state.step, data: state.data }, hasMeaningfulVenueBookingDraft(state.data, initialData))
  }, [initialData, state.data, state.step])

  const setField = useCallback((field: VenueBookingTextField, value: string) => {
    dispatch({ type: 'SET_FIELD', field, value })
    clearError(errorIdByField[field])
  }, [clearError])

  const setVenue = useCallback((venueId: string) => {
    dispatch({ type: 'SET_VENUE', venueId })
    clearError('venue')
    clearError('venue-slots')
  }, [clearError])

  const setEvent = useCallback((eventId: string) => {
    dispatch({ type: 'SET_EVENT', eventId })
    clearError('event')
    clearError('event-other')
  }, [clearError])

  const setBookingDate = useCallback((date: Date) => {
    dispatch({ type: 'SET_BOOKING_DATE', bookingDate: formatCalendarDateKey(date) })
    clearError('venue-slots')
  }, [clearError])

  const setSlots = useCallback((slotStarts: string[]) => {
    dispatch({ type: 'SET_SLOTS', slotStarts })
    clearError('venue-slots')
  }, [clearError])

  const setRecurrence = useCallback((action: VenueRecurrenceAction) => {
    dispatch({ type: 'SET_RECURRENCE', action })
    clearError('recurrence')
    clearError('recurrence-end')
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
      clearSubmissionDraft('venue')
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit venue booking'
      dispatch({ type: 'SUBMIT_ERROR', error: message })
      return null
    }
  }, [state.data])

  return {
    state: { ...state, validationErrors, bookingWindow: deriveBookingWindow(state.data.slotStarts) },
    actions: { setField, setVenue, setEvent, setBookingDate, setSlots, setRecurrence, nextStep, prevStep, submit, validateCurrentStep },
    meta: { isLastStep: state.step === LAST_STEP, totalSteps: LAST_STEP },
  }
}
