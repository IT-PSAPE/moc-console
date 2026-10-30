import { Toast as BaseToast } from '@base-ui/react/toast'
import type { ReactNode } from 'react'
import { FeedbackRoot } from './feedback-root'

export { useFeedback } from './feedback-context'

export function FeedbackProvider({ children }: { children: ReactNode }) {
    return (
        <BaseToast.Provider timeout={4000} limit={Number.POSITIVE_INFINITY}>
            <FeedbackRoot>{children}</FeedbackRoot>
        </BaseToast.Provider>
    )
}
