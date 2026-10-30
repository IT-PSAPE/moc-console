import { Toast as BaseToast } from '@base-ui/react/toast'
import { useOverlayStack } from '../overlays/overlay-provider'
import { useFullscreenElement } from '../../hooks/use-fullscreen-element'
import { Toast } from './toast'
import type { ToastData } from './feedback-types'

export function ToastViewport() {
    const { toasts } = BaseToast.useToastManager<ToastData>()
    const { state } = useOverlayStack()
    const fullscreenElement = useFullscreenElement()

    function renderToast(toast: BaseToast.Root.ToastObject<ToastData>) {
        return <Toast key={toast.id} toast={toast} />
    }

    if (!state.rootElement) return null

    // Keep shadows inside the scroll area while preserving the cards' screen insets.
    return (
        <BaseToast.Portal container={fullscreenElement ?? state.rootElement}>
            <BaseToast.Viewport className="pointer-events-auto fixed right-[max(1.5rem,env(safe-area-inset-right))] bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-[10000] -mr-6 -mb-6 flex max-h-svh w-[25rem] max-w-full flex-col-reverse gap-3 overflow-y-auto overscroll-contain p-6 outline-none empty:hidden landscape:right-auto landscape:bottom-[max(1rem,env(safe-area-inset-bottom))] landscape:left-1/2 landscape:mr-0 landscape:-mb-4 landscape:max-h-[calc(60svh+2rem)] landscape:w-full landscape:max-w-[30rem] landscape:-translate-x-1/2 landscape:p-4">
                {toasts.map(renderToast)}
            </BaseToast.Viewport>
        </BaseToast.Portal>
    )
}
