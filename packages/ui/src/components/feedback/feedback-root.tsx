import type { ReactNode } from 'react'
import { FeedbackContext } from './feedback-context'
import { useFeedbackProvider } from './use-feedback-provider'
import { ToastViewport } from './toast-viewport'

export function FeedbackRoot({ children }: { children: ReactNode }) {
    const value = useFeedbackProvider()

    return (
        <FeedbackContext.Provider value={value}>
            {children}
            <ToastViewport />
        </FeedbackContext.Provider>
    )
}
