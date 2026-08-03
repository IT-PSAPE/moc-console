import { Toast as BaseToast } from '@base-ui/react/toast'
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { useOverlayStack } from '../overlays/overlay-provider'
import { Toast, type ToastData } from './toast'
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

    function renderToast(toast: BaseToast.Root.ToastObject<ToastData>) {
        return <Toast key={toast.id} toast={toast} />
    }

    return (
        <BaseToast.Portal container={container}>
            <BaseToast.Viewport
                className="pointer-events-none fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))] w-[min(calc(100vw-2rem),24rem)] outline-none sm:right-[max(1.5rem,env(safe-area-inset-right))] sm:bottom-[max(1.5rem,env(safe-area-inset-bottom))]"
                style={{ zIndex }}
            >
                {toasts.map(renderToast)}
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
        toastManager.close(id)
    }, [])

    const toast = useCallback((options: ToastOptions) => {
        return toastManager.add({
            title: options.title,
            description: options.description,
            timeout: options.duration ?? 4000,
            data: {
                dismissible: true,
                variant: options.variant ?? 'info',
                style: options.style ?? 'filled',
            },
        })
    }, [])

    const notify = useCallback((options: NotificationOptions) => {
        return toastManager.add({
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
        </FeedbackContext.Provider>
    )
}
