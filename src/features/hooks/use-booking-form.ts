import { useReducer, useCallback } from 'react'
import { submitPublicBookingBatch } from '@/data/submit-booking'
import type { BookingFormData, SubmitBookingResult } from '@/types/booking'

type BookingFormState = {
  step: number
  data: BookingFormData
  submitting: boolean
  error: string | null
}

type BookingFormAction =
  | { type: 'TOGGLE_EQUIPMENT'; id: string }
  | { type: 'SET_FIELD'; field: keyof BookingFormData; value: string }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; error: string }

const initialData: BookingFormData = {
  equipmentIds: [],
  bookedBy: '',
  checkedOutAt: '',
  expectedReturnAt: '',
  notes: '',
}

function reducer(state: BookingFormState, action: BookingFormAction): BookingFormState {
  switch (action.type) {
    case 'TOGGLE_EQUIPMENT': {
      const ids = state.data.equipmentIds
      const next = ids.includes(action.id)
        ? ids.filter((id) => id !== action.id)
        : [...ids, action.id]
      return { ...state, data: { ...state.data, equipmentIds: next } }
    }
    case 'SET_FIELD':
      return { ...state, data: { ...state.data, [action.field]: action.value } }
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

// Step 1: Details (name, dates) — Step 2: Equipment — Step 3: Review
function canProceedFromStep(step: number, data: BookingFormData): boolean {
  switch (step) {
    case 1:
      return Boolean(data.bookedBy.trim() && data.checkedOutAt && data.expectedReturnAt)
    case 2:
      return data.equipmentIds.length > 0
    case 3:
      return true
    default:
      return false
  }
}

export function useBookingForm() {
  const [state, dispatch] = useReducer(reducer, {
    step: 1,
    data: initialData,
    submitting: false,
    error: null,
  })

  const toggleEquipment = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_EQUIPMENT', id })
  }, [])

  const setField = useCallback((field: keyof BookingFormData, value: string) => {
    dispatch({ type: 'SET_FIELD', field, value })
  }, [])

  const nextStep = useCallback(() => {
    dispatch({ type: 'NEXT_STEP' })
  }, [])

  const prevStep = useCallback(() => {
    dispatch({ type: 'PREV_STEP' })
  }, [])

  const canProceed = useCallback(() => {
    return canProceedFromStep(state.step, state.data)
  }, [state.step, state.data])

  const submit = useCallback(async (): Promise<SubmitBookingResult | null> => {
    dispatch({ type: 'SUBMIT_START' })
    try {
      const result = await submitPublicBookingBatch(state.data)
      dispatch({ type: 'SUBMIT_SUCCESS' })
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit booking'
      dispatch({ type: 'SUBMIT_ERROR', error: message })
      return null
    }
  }, [state.data])

  return {
    state,
    actions: { toggleEquipment, setField, nextStep, prevStep, submit, canProceed },
  }
}
