import { Toast as BaseToast } from '@base-ui/react/toast'
import { useCallback, useMemo } from 'react'
import type { FeedbackContextValue } from './feedback-context'
import { feedbackDuration } from './feedback-options'
import type { NotificationOptions, ToastData, ToastOptions } from './feedback-types'

const emptyState: Record<string, never> = {}

export function useFeedbackProvider(): FeedbackContextValue {
    const { add, close, update } = BaseToast.useToastManager<ToastData>()

    const toast = useCallback(function toast(options: ToastOptions): string {
        return add({
            title: options.title,
            description: options.description,
            timeout: feedbackDuration(options.variant, options.duration),
            priority: options.variant === 'error' ? 'high' : 'low',
            data: { dismissible: true, variant: options.variant ?? 'info' },
        })
    }, [add])

    const notify = useCallback(function notify(options: NotificationOptions): string {
        return add({
            title: options.title,
            description: options.description,
            timeout: 0,
            priority: options.variant === 'error' ? 'high' : 'low',
            actionProps: options.action ? { children: options.action.label, onClick: options.action.onClick } : undefined,
            data: { dismissible: options.dismissible ?? true, variant: options.variant ?? 'info' },
        })
    }, [add])

    return useMemo(function createValue(): FeedbackContextValue {
        return {
            state: emptyState,
            actions: { toast, notify, dismissToast: close, dismissNotification: close },
            meta: { add, close, update },
        }
    }, [add, close, notify, toast, update])
}
