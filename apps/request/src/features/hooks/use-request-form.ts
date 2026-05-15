import { useReducer, useCallback } from 'react'
import { submitPublicRequest } from '@/data/submit-request'
import type { RequestFormData, SubmitRequestResult, RequestPriority, RequestCategory } from '@/types/request'

type RequestFormState = {
  step: number
  data: RequestFormData
  submitting: boolean
  error: string | null
}

type RequestFormAction =
  | { type: 'SET_FIELD'; field: keyof RequestFormData; value: string }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; error: string }

const initialData: RequestFormData = {
  title: '',
  requestedBy: '',
  priority: 'medium' as RequestPriority,
  dueDate: '',
  category: 'video_production' as RequestCategory,
  who: '',
  what: '',
  whenText: '',
  whereText: '',
  why: '',
  how: '',
  notes: '',
  flow: '',
}

function reducer(state: RequestFormState, action: RequestFormAction): RequestFormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, data: { ...state.data, [action.field]: action.value } }
    case 'NEXT_STEP':
      return { ...state, step: Math.min(state.step + 1, 4) }
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

function canProceedFromStep(step: number, data: RequestFormData): boolean {
  switch (step) {
    case 1:
      return Boolean(data.title.trim() && data.requestedBy.trim() && data.dueDate)
    case 2:
      return Boolean(
        data.who.trim() && data.what.trim() && data.whenText.trim() &&
        data.whereText.trim() && data.why.trim() && data.how.trim()
      )
    case 3:
      return true
    case 4:
      return true
    default:
      return false
  }
}

export function useRequestForm() {
  const [state, dispatch] = useReducer(reducer, {
    step: 1,
    data: initialData,
    submitting: false,
    error: null,
  })

  const setField = useCallback((field: keyof RequestFormData, value: string) => {
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

  const submit = useCallback(async (): Promise<SubmitRequestResult | null> => {
    dispatch({ type: 'SUBMIT_START' })
    try {
      const result = await submitPublicRequest(state.data)
      dispatch({ type: 'SUBMIT_SUCCESS' })
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit request'
      dispatch({ type: 'SUBMIT_ERROR', error: message })
      return null
    }
  }, [state.data])

  return {
    state,
    actions: { setField, nextStep, prevStep, submit, canProceed },
  }
}
