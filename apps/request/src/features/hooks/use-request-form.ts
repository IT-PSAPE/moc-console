import { useReducer, useCallback, useEffect } from 'react'
import { submitPublicRequest } from '@/data/submit-request'
import { clearRequestDraft, getEmptyRequestDraft, loadRequestDraft, saveRequestDraft } from '@/data/request-draft-storage'
import { getRequestStepErrors } from '@/features/public-flow-validation'
import { useStepValidation } from '@/features/hooks/use-step-validation'
import type { RequestFormData, SubmitRequestResult } from '@/types/request'

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

function getInitialData(): RequestFormData {
  return getEmptyRequestDraft()
}

function getInitialState(): RequestFormState {
  const savedDraft = loadRequestDraft()
  return savedDraft
    ? { ...savedDraft, submitting: false, error: null }
    : { step: 1, data: getInitialData(), submitting: false, error: null }
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

const errorIdByField: Partial<Record<keyof RequestFormData, string>> = {
  title: 'title',
  requestedBy: 'requested-by',
  dueDate: 'due-date-date',
  who: 'who',
  what: 'what',
  whenText: 'when-text',
  whereText: 'where-text',
  why: 'why',
  how: 'how',
}

export function useRequestForm() {
  const [state, dispatch] = useReducer(reducer, undefined, getInitialState)
  const validation = useStepValidation()
  const { errors: validationErrors } = validation.state
  const { clearError, validate } = validation.actions

  useEffect(() => {
    saveRequestDraft({ step: state.step, data: state.data })
  }, [state.data, state.step])

  const setField = useCallback((field: keyof RequestFormData, value: string) => {
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
    return validate(getRequestStepErrors(state.step, state.data))
  }, [state.step, state.data, validate])

  const submit = useCallback(async (): Promise<SubmitRequestResult | null> => {
    dispatch({ type: 'SUBMIT_START' })
    try {
      const result = await submitPublicRequest(state.data)
      dispatch({ type: 'SUBMIT_SUCCESS' })
      clearRequestDraft()
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit request'
      dispatch({ type: 'SUBMIT_ERROR', error: message })
      return null
    }
  }, [state.data])

  return {
    state: { ...state, validationErrors },
    actions: { setField, nextStep, prevStep, submit, validateCurrentStep },
  }
}
