import { useReducer, useCallback } from 'react'
import { submitPublicBookingBatch } from '@/data/submit-booking'
import { getBookingStepErrors } from '@/features/public-flow-validation'
import { useStepValidation } from '@/features/hooks/use-step-validation'
import type { BookingFormData, SubmitBookingResult } from '@/types/booking'
// TODO(equipment-inventory): STOPGAP import — only used to order the
// hardcoded equipment selections in the assembled notes. Remove with the
// rest of the stopgap once live inventory is restored.
import { BOOKABLE_EQUIPMENT } from '@/features/components/booking-equipment-picker'

export type BookingFormState = {
  step: number
  data: BookingFormData
  submitting: boolean
  error: string | null
}

type BookingFormAction =
  | { type: 'TOGGLE_EQUIPMENT'; id: string }
  | { type: 'TOGGLE_REQUESTED_EQUIPMENT'; label: string }
  | { type: 'SET_FIELD'; field: keyof BookingFormData; value: string }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; error: string }

const initialData: BookingFormData = {
  title: '',
  equipmentIds: [],
  // TODO(equipment-inventory): STOPGAP — see BookingFormData / picker.
  requestedEquipment: [],
  otherEquipment: '',
  bookedBy: '',
  checkedOutAt: '',
  expectedReturnAt: '',
  notes: '',
}

// TODO(equipment-inventory): STOPGAP — assemble the hardcoded equipment
// selection into the booking's notes. Selections are listed in display
// order, with the free-text "Other" entry last. Remove once live inventory
// (real equipmentIds) is restored.
function assembleBookingNotes(data: BookingFormData): string {
  const lines = BOOKABLE_EQUIPMENT
    .filter((label) => data.requestedEquipment.includes(label))
    .map((label) => `- ${label}`)

  const other = data.otherEquipment.trim()
  if (other) lines.push(`- Other: ${other}`)

  const userNotes = data.notes.trim()
  if (lines.length === 0) return userNotes

  const section = `Requested equipment:\n${lines.join('\n')}`
  return userNotes ? `${userNotes}\n\n---\n\n${section}` : section
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
    // TODO(equipment-inventory): STOPGAP — toggle a hardcoded equipment label.
    case 'TOGGLE_REQUESTED_EQUIPMENT': {
      const labels = state.data.requestedEquipment
      const next = labels.includes(action.label)
        ? labels.filter((label) => label !== action.label)
        : [...labels, action.label]
      return { ...state, data: { ...state.data, requestedEquipment: next } }
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

const errorIdByField: Partial<Record<keyof BookingFormData, string>> = {
  title: 'title',
  bookedBy: 'booked-by',
  checkedOutAt: 'checkout-date',
  expectedReturnAt: 'expected-return-date',
  requestedEquipment: 'booking-equipment',
  otherEquipment: 'booking-equipment',
}

export function useBookingForm() {
  const [state, dispatch] = useReducer(reducer, {
    step: 1,
    data: initialData,
    submitting: false,
    error: null,
  })
  const validation = useStepValidation()
  const { errors: validationErrors } = validation.state
  const { clearError, validate } = validation.actions

  const toggleEquipment = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_EQUIPMENT', id })
  }, [])

  // TODO(equipment-inventory): STOPGAP — toggle a hardcoded equipment label.
  const toggleRequestedEquipment = useCallback((label: string) => {
    dispatch({ type: 'TOGGLE_REQUESTED_EQUIPMENT', label })
    clearError('booking-equipment')
  }, [clearError])

  const setField = useCallback((field: keyof BookingFormData, value: string) => {
    dispatch({ type: 'SET_FIELD', field, value })
    const errorId = errorIdByField[field]
    if (errorId) clearError(errorId)
  }, [clearError])

  const nextStep = useCallback(() => {
    dispatch({ type: 'NEXT_STEP' })
  }, [])

  const prevStep = useCallback(() => {
    dispatch({ type: 'PREV_STEP' })
  }, [])

  const validateCurrentStep = useCallback(() => {
    return validate(getBookingStepErrors(state.step, state.data))
  }, [state.step, state.data, validate])

  const submit = useCallback(async (): Promise<SubmitBookingResult | null> => {
    dispatch({ type: 'SUBMIT_START' })
    try {
      // TODO(equipment-inventory): STOPGAP — fold the hardcoded equipment
      // selection into notes and submit with an empty equipmentIds. Restore
      // submitting `state.data` directly (with real equipmentIds) later.
      const payload: BookingFormData = {
        ...state.data,
        equipmentIds: [],
        notes: assembleBookingNotes(state.data),
      }
      const result = await submitPublicBookingBatch(payload)
      dispatch({ type: 'SUBMIT_SUCCESS' })
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit booking'
      dispatch({ type: 'SUBMIT_ERROR', error: message })
      return null
    }
  }, [state.data])

  return {
    state: { ...state, validationErrors },
    actions: { toggleEquipment, toggleRequestedEquipment, setField, nextStep, prevStep, submit, validateCurrentStep },
  }
}
