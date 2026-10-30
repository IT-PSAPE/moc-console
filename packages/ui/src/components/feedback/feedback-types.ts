import type { ReactNode } from 'react'
import type { FeedbackVariant } from './alert'

export type ToastData = {
    variant: FeedbackVariant
    dismissible: boolean
    action?: ReactNode
}

export type ToastOptions = {
    title: string
    description?: string
    variant?: FeedbackVariant
    duration?: number
}

export type NotificationOptions = Omit<ToastOptions, 'duration'> & {
    dismissible?: boolean
    action?: { label: string; onClick: () => void }
}

export type NotificationProps = ToastOptions & {
    action?: ReactNode
    dismissible?: boolean
    /** Called on dismissal or timeout, but not when the source unmounts. */
    onClose?: () => void
}
