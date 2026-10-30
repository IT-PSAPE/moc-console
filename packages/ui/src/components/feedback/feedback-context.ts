import { createContext, useContext } from 'react'
import type { Toast as BaseToast } from '@base-ui/react/toast'
import type { NotificationOptions, ToastData, ToastOptions } from './feedback-types'

type FeedbackActions = {
    toast: (options: ToastOptions) => string
    notify: (options: NotificationOptions) => string
    dismissToast: (id: string) => void
    dismissNotification: (id: string) => void
}

export type FeedbackContextValue = {
    state: Record<string, never>
    actions: FeedbackActions
    meta: Pick<ReturnType<typeof BaseToast.useToastManager<ToastData>>, 'add' | 'update' | 'close'>
}

export const FeedbackContext = createContext<FeedbackContextValue | null>(null)

export function useFeedbackContext(): FeedbackContextValue {
    const context = useContext(FeedbackContext)
    if (!context) throw new Error('useFeedback must be used within a FeedbackProvider')
    return context
}

export function useFeedback(): FeedbackActions {
    return useFeedbackContext().actions
}
