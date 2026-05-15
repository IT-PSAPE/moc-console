import { useCallback, useEffect, useMemo, useReducer } from 'react'
import type { Request } from '@/types/requests'
import { updateRequest } from '@/data/mutate-requests'
import { getErrorMessage } from '@/utils/get-error-message'

// ─── State ──────────────────────────────────────────────────────────

type RequestStoreState = {
    original: Request
    draft: Request
    isSaving: boolean
    error: string | null
}

type Action =
    | { type: 'UPDATE_FIELD'; field: keyof Request; value: Request[keyof Request] }
    | { type: 'SAVE_START' }
    | { type: 'SAVE_SUCCESS'; request: Request }
    | { type: 'SAVE_ERROR'; error: string }
    | { type: 'DISCARD' }
    | { type: 'RESET'; request: Request }

function reducer(state: RequestStoreState, action: Action): RequestStoreState {
    switch (action.type) {
        case 'UPDATE_FIELD':
            return {
                ...state,
                draft: { ...state.draft, [action.field]: action.value },
            }
        case 'SAVE_START':
            return { ...state, isSaving: true, error: null }
        case 'SAVE_SUCCESS':
            return { ...state, original: action.request, draft: action.request, isSaving: false, error: null }
        case 'SAVE_ERROR':
            return { ...state, draft: state.original, isSaving: false, error: action.error }
        case 'DISCARD':
            return { ...state, draft: state.original, error: null }
        case 'RESET':
            return { original: action.request, draft: action.request, isSaving: false, error: null }
    }
}

type UseRequestStoreOptions = {
    syncRequest?: (request: Request) => void
}

// ─── Hook ───────────────────────────────────────────────────────────

export function useRequestStore(initialRequest: Request, options?: UseRequestStoreOptions) {
    const [state, dispatch] = useReducer(reducer, {
        original: initialRequest,
        draft: initialRequest,
        isSaving: false,
        error: null,
    })

    const isDirty = useMemo(
        () => JSON.stringify(state.draft) !== JSON.stringify(state.original),
        [state.draft, state.original],
    )

    useEffect(() => {
        if (state.original.id !== initialRequest.id || !isDirty) {
            dispatch({ type: 'RESET', request: initialRequest })
        }
    }, [initialRequest, isDirty, state.original.id])

    const updateField = useCallback(<K extends keyof Request>(field: K, value: Request[K]) => {
        dispatch({ type: 'UPDATE_FIELD', field, value })
    }, [])

    const save = useCallback(async () => {
        const previousRequest = state.original
        const nextRequest = { ...state.draft, updatedAt: new Date().toISOString() }

        dispatch({ type: 'SAVE_START' })
        options?.syncRequest?.(nextRequest)

        try {
            const persistedRequest = await updateRequest(nextRequest)
            options?.syncRequest?.(persistedRequest)
            dispatch({ type: 'SAVE_SUCCESS', request: persistedRequest })
            return persistedRequest
        } catch (error) {
            const message = getErrorMessage(error, 'Request could not be saved. Please review the request details and try again.')
            options?.syncRequest?.(previousRequest)
            dispatch({ type: 'SAVE_ERROR', error: message })
            throw new Error(message)
        }
    }, [options, state.draft, state.original])

    const discard = useCallback(() => {
        dispatch({ type: 'DISCARD' })
    }, [])

    const reset = useCallback((request: Request) => {
        dispatch({ type: 'RESET', request })
    }, [])

    return {
        state: {
            original: state.original,
            draft: state.draft,
            isDirty,
            isSaving: state.isSaving,
            error: state.error,
        },
        actions: {
            updateField,
            save,
            discard,
            reset,
        },
    }
}
