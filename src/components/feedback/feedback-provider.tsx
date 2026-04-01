import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useOverlayStack } from '../overlays/overlay-provider'
import { Toast, type ToastData } from './toast'
import { Notification, type NotificationData } from './notification'
import type { FeedbackVariant, FeedbackStyle } from './alert'

// ─── Types ──────────────────────────────────────────────────────────

type ToastOptions = {
    title: string
    description?: string
    variant?: FeedbackVariant
    style?: FeedbackStyle
    duration?: number
}

type NotificationOptions = {
    title: string
    description?: string
    variant?: FeedbackVariant
    style?: FeedbackStyle
    dismissible?: boolean
    action?: { label: string; onClick: () => void }
}

type FeedbackContextValue = {
    toast: (options: ToastOptions) => string
    notify: (options: NotificationOptions) => string
    dismissToast: (id: string) => void
    dismissNotification: (id: string) => void
}

// ─── Context ────────────────────────────────────────────────────────

const FeedbackContext = createContext<FeedbackContextValue | null>(null)

export function useFeedback() {
    const context = useContext(FeedbackContext)
    if (!context) {
        throw new Error('useFeedback must be used within a FeedbackProvider')
    }
    return context
}

// ─── Provider ───────────────────────────────────────────────────────

let nextId = 0
function generateId() {
    return `feedback-${++nextId}`
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastData[]>([])
    const [notifications, setNotifications] = useState<NotificationData[]>([])
    const { state: overlayState, meta: overlayMeta } = useOverlayStack()
    const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id))
        const timer = timersRef.current.get(id)
        if (timer) {
            clearTimeout(timer)
            timersRef.current.delete(id)
        }
    }, [])

    const dismissNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id))
    }, [])

    const toast = useCallback((options: ToastOptions) => {
        const id = generateId()
        const duration = options.duration ?? 4000
        const data: ToastData = {
            id,
            title: options.title,
            description: options.description,
            variant: options.variant ?? 'info',
            style: options.style ?? 'filled',
            duration,
        }

        setToasts(prev => [...prev, data])

        const timer = setTimeout(() => {
            dismissToast(id)
        }, duration)
        timersRef.current.set(id, timer)

        return id
    }, [dismissToast])

    const notify = useCallback((options: NotificationOptions) => {
        const id = generateId()
        const data: NotificationData = {
            id,
            title: options.title,
            description: options.description,
            variant: options.variant ?? 'info',
            style: options.style ?? 'filled',
            dismissible: options.dismissible ?? true,
            action: options.action,
        }

        setNotifications(prev => [...prev, data])
        return id
    }, [])

    const value = useMemo<FeedbackContextValue>(() => ({
        toast,
        notify,
        dismissToast,
        dismissNotification,
    }), [toast, notify, dismissToast, dismissNotification])

    const zIndex = overlayMeta.baseZIndex + 100

    return (
        <FeedbackContext.Provider value={value}>
            {children}

            {/* Toast container — bottom center */}
            {overlayState.rootElement && toasts.length > 0 && createPortal(
                <div
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col-reverse items-center gap-2 pointer-events-auto"
                    style={{ zIndex }}
                >
                    {toasts.map(t => (
                        <Toast key={t.id} toast={t} onDismiss={dismissToast} />
                    ))}
                </div>,
                overlayState.rootElement,
            )}

            {/* Notification container — bottom right */}
            {overlayState.rootElement && notifications.length > 0 && createPortal(
                <div
                    className="fixed bottom-6 right-6 flex flex-col-reverse items-end gap-2 pointer-events-auto"
                    style={{ zIndex }}
                >
                    {notifications.map(n => (
                        <Notification key={n.id} notification={n} onDismiss={dismissNotification} />
                    ))}
                </div>,
                overlayState.rootElement,
            )}
        </FeedbackContext.Provider>
    )
}
