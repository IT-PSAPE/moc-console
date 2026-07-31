import { Toast as BaseToast } from '@base-ui/react/toast'
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { useOverlayStack } from '../overlays/overlay-provider'
import { Toast, type ToastData } from './toast'
import { Notification, type NotificationData } from './notification'
import type { FeedbackVariant, FeedbackStyle } from './alert'

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

const FeedbackContext = createContext<FeedbackContextValue | null>(null)
const toastManager = BaseToast.createToastManager<ToastData>()
const notificationManager = BaseToast.createToastManager<NotificationData>()

export function useFeedback() {
    const context = useContext(FeedbackContext)
    if (!context) {
        throw new Error('useFeedback must be used within a FeedbackProvider')
    }
    return context
}

function ToastViewport({ container, zIndex }: { container: HTMLElement | null; zIndex: number }) {
    const { toasts } = BaseToast.useToastManager<ToastData>()
    if (!container) return null

    return (
        <BaseToast.Portal container={container}>
            <BaseToast.Viewport
                className="pointer-events-none fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 flex w-[min(calc(100vw-2rem),24rem)] -translate-x-1/2 flex-col-reverse items-center gap-2 outline-none"
                style={{ zIndex }}
            >
                {toasts.map((toast) => <Toast key={toast.id} toast={toast} />)}
            </BaseToast.Viewport>
        </BaseToast.Portal>
    )
}

function NotificationViewport({ container, zIndex }: { container: HTMLElement | null; zIndex: number }) {
    const { toasts } = BaseToast.useToastManager<NotificationData>()
    if (!container) return null

    return (
        <BaseToast.Portal container={container}>
            <BaseToast.Viewport
                className="pointer-events-none fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-[max(1.5rem,env(safe-area-inset-right))] flex w-[min(calc(100vw-3rem),24rem)] flex-col-reverse items-end gap-2 outline-none"
                style={{ zIndex }}
            >
                {toasts.map((notification) => <Notification key={notification.id} notification={notification} />)}
            </BaseToast.Viewport>
        </BaseToast.Portal>
    )
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
    const { state: overlayState, meta: overlayMeta } = useOverlayStack()

    const dismissToast = useCallback((id: string) => {
        toastManager.close(id)
    }, [])

    const dismissNotification = useCallback((id: string) => {
        notificationManager.close(id)
    }, [])

    const toast = useCallback((options: ToastOptions) => {
        return toastManager.add({
            title: options.title,
            description: options.description,
            timeout: options.duration ?? 4000,
            data: {
                variant: options.variant ?? 'info',
                style: options.style ?? 'filled',
            },
        })
    }, [])

    const notify = useCallback((options: NotificationOptions) => {
        return notificationManager.add({
            title: options.title,
            description: options.description,
            timeout: 0,
            priority: 'high',
            actionProps: options.action ? {
                children: options.action.label,
                onClick: options.action.onClick,
            } : undefined,
            data: {
                dismissible: options.dismissible ?? true,
                style: options.style ?? 'filled',
                variant: options.variant ?? 'info',
            },
        })
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
            <BaseToast.Provider toastManager={toastManager} timeout={4000}>
                <ToastViewport container={overlayState.rootElement} zIndex={zIndex} />
            </BaseToast.Provider>
            <BaseToast.Provider toastManager={notificationManager} timeout={0}>
                <NotificationViewport container={overlayState.rootElement} zIndex={zIndex} />
            </BaseToast.Provider>
        </FeedbackContext.Provider>
    )
}
