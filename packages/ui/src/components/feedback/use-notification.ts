import { useEffect, useId, useRef } from 'react'
import { useFeedbackContext } from './feedback-context'
import { feedbackDuration } from './feedback-options'
import type { NotificationProps, ToastData } from './feedback-types'

/** Registers a source-bound notice; updates keep a dismissed notice closed until the source remounts. */
export function useNotification({ title, description, variant = 'info', action, dismissible = true, onClose, duration }: NotificationProps): void {
    const { meta: { add, close, update } } = useFeedbackContext()
    const id = useId()
    const timeout = feedbackDuration(variant, duration, Boolean(action))
    const priority = variant === 'error' ? 'high' : 'low'
    const optionsRef = useRef<Parameters<typeof add>[0]>({ title, description, priority, timeout, onClose, data: { action, dismissible, variant } })

    useEffect(function updateOptions() {
        const data: ToastData = { action, dismissible, variant }
        optionsRef.current = { title, description, priority, timeout, onClose, data }
        update(id, { title, description, priority, data })
    }, [action, description, dismissible, id, onClose, priority, timeout, title, update, variant])

    useEffect(function registerNotification() {
        let active = true

        function handleClose(): void {
            if (active) optionsRef.current.onClose?.()
        }

        add({ ...optionsRef.current, id, onClose: handleClose })

        return function unregisterNotification(): void {
            active = false
            close(id)
        }
    }, [add, close, id])

    useEffect(function updateTimeout() {
        update(id, { timeout })
    }, [id, timeout, update])
}
