import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { useModal } from './modal-context'
import { useOverlayStack } from './overlay-provider'

export function ModalPortal({ children }: { children: ReactNode }) {
    const { state } = useModal()
    const { state: overlayState } = useOverlayStack()

    if (!state.isOpen || !overlayState.rootElement) {
        return null
    }

    return createPortal(
        <div className="pointer-events-none fixed inset-0" style={{ zIndex: state.zIndex }}>
            {children}
        </div>,
        overlayState.rootElement,
    )
}
