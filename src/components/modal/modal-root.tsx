import { useCallback, useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import { ModalProvider, type ModalContextValue } from './modal-context'
import { useOverlayStack } from './overlay-provider'

type ModalRootProps = {
    children: ReactNode
    closeOnBackdropClick?: boolean
    closeOnEscape?: boolean
    defaultOpen?: boolean
    onOpenChange?: (nextOpen: boolean) => void
    open?: boolean
}

export function ModalRoot({ children, closeOnBackdropClick = true, closeOnEscape = true, defaultOpen = false, onOpenChange, open }: ModalRootProps) {
    const modalId = useId()
    const isControlled = open !== undefined
    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
    const [titleId, setTitleId] = useState<string | undefined>(undefined)
    const [descriptionId, setDescriptionId] = useState<string | undefined>(undefined)
    const { state: overlayState, actions: overlayActions, meta: overlayMeta } = useOverlayStack()

    const isOpen = isControlled ? open : uncontrolledOpen
    const stackIndex = overlayState.stack.indexOf(modalId)
    const isTopmost = stackIndex === overlayState.stack.length - 1 && stackIndex >= 0
    const zIndex = overlayMeta.baseZIndex + Math.max(stackIndex, 0) * 10

    const setOpenState = useCallback((nextOpen: boolean) => {
        if (!isControlled) {
            setUncontrolledOpen(nextOpen)
        }

        onOpenChange?.(nextOpen)
    }, [isControlled, onOpenChange])

    const openModal = useCallback(() => {
        setOpenState(true)
    }, [setOpenState])

    const closeModal = useCallback(() => {
        setOpenState(false)
    }, [setOpenState])

    const assignTitleId = useCallback((id?: string) => {
        setTitleId(id)
    }, [])

    const assignDescriptionId = useCallback((id?: string) => {
        setDescriptionId(id)
    }, [])

    useEffect(() => {
        if (!isOpen) {
            overlayActions.unregister(modalId)
            return undefined
        }

        overlayActions.register(modalId)

        return () => {
            overlayActions.unregister(modalId)
        }
    }, [isOpen, modalId, overlayActions])

    useEffect(() => {
        if (!isOpen || !isTopmost || !closeOnEscape) {
            return undefined
        }

        function handleDocumentKeyDown(event: KeyboardEvent) {
            if (event.key !== 'Escape') {
                return
            }

            event.preventDefault()
            closeModal()
        }

        document.addEventListener('keydown', handleDocumentKeyDown)

        return () => {
            document.removeEventListener('keydown', handleDocumentKeyDown)
        }
    }, [closeModal, closeOnEscape, isOpen, isTopmost])

    const value = useMemo<ModalContextValue>(() => ({
        state: {
            isOpen,
            isTopmost,
            zIndex,
        },
        actions: {
            close: closeModal,
            open: openModal,
            setOpen: setOpenState,
        },
        meta: {
            closeOnBackdropClick,
            descriptionId,
            setDescriptionId: assignDescriptionId,
            setTitleId: assignTitleId,
            titleId,
        },
    }), [assignDescriptionId, assignTitleId, closeModal, closeOnBackdropClick, descriptionId, isOpen, isTopmost, openModal, setOpenState, titleId, zIndex])

    return (
        <ModalProvider value={value}>
            {children}
        </ModalProvider>
    )
}
