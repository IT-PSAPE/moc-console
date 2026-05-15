import { cn } from '@moc/utils/cn'
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type HTMLAttributes, type ReactNode } from 'react'
import { useOverlayStack } from './overlay-provider'
import { OverlayBackdrop, OverlayClose, OverlayContent, OverlayFooter, OverlayHeader, OverlayPortal, OverlayTrigger } from './overlay-primitives'

// ─── Context ─────────────────────────────────────────────────────────

type ModalContextValue = {
    state: {
        isOpen: boolean
        isTopmost: boolean
        zIndex: number
    }
    actions: {
        close: () => void
        open: () => void
        setOpen: (nextOpen: boolean) => void
    }
    meta: {
        closeOnBackdropClick: boolean
        descriptionId?: string
        setDescriptionId: (id?: string) => void
        setTitleId: (id?: string) => void
        titleId?: string
    }
}

const ModalContext = createContext<ModalContextValue | null>(null)

export function useModal() {
    const context = useContext(ModalContext)

    if (!context) {
        throw new Error('useModal must be used within a Modal')
    }

    return context
}

// ─── Root ────────────────────────────────────────────────────────────

type ModalRootProps = {
    children: ReactNode
    closeOnBackdropClick?: boolean
    closeOnEscape?: boolean
    defaultOpen?: boolean
    onOpenChange?: (nextOpen: boolean) => void
    open?: boolean
}

function ModalRoot({ children, closeOnBackdropClick = true, closeOnEscape = true, defaultOpen = false, onOpenChange, open }: ModalRootProps) {
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
        <ModalContext.Provider value={value}>
            {children}
        </ModalContext.Provider>
    )
}

// ─── Trigger ─────────────────────────────────────────────────────────

function ModalTrigger(props: HTMLAttributes<HTMLSpanElement>) {
    const { actions } = useModal()
    return <OverlayTrigger onOpen={actions.open} {...props} />
}

// ─── Close ───────────────────────────────────────────────────────────

function ModalClose(props: HTMLAttributes<HTMLSpanElement>) {
    const { actions } = useModal()
    return <OverlayClose onClose={actions.close} {...props} />
}

// ─── Portal ──────────────────────────────────────────────────────────

function ModalPortal({ children }: { children: ReactNode }) {
    const { state } = useModal()
    return <OverlayPortal isOpen={state.isOpen} zIndex={state.zIndex}>{children}</OverlayPortal>
}

// ─── Backdrop ────────────────────────────────────────────────────────

function ModalBackdrop(props: HTMLAttributes<HTMLDivElement>) {
    const { actions, meta } = useModal()
    return <OverlayBackdrop closeOnClick={meta.closeOnBackdropClick} onClose={actions.close} {...props} />
}

// ─── Positioner ──────────────────────────────────────────────────────

function ModalPositioner({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn('pointer-events-none fixed inset-0 flex items-center justify-center p-2', className)} {...props}>
            {children}
        </div>
    )
}

// ─── Panel ───────────────────────────────────────────────────────────

function ModalPanel({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    const panelRef = useRef<HTMLDivElement | null>(null)
    const { state, meta } = useModal()

    useEffect(() => {
        if (!state.isOpen || !state.isTopmost) {
            return
        }

        panelRef.current?.focus()
    }, [state.isOpen, state.isTopmost])

    return (
        <div
            ref={panelRef}
            aria-describedby={meta.descriptionId}
            aria-labelledby={meta.titleId}
            aria-modal="true"
            className={cn('pointer-events-auto flex w-full max-w-md flex-col rounded-xl border border-secondary bg-primary', className)}
            role="dialog"
            tabIndex={-1}
            {...props}
        >
            {children}
        </div>
    )
}

// ─── Header / Content / Footer ───────────────────────────────────────

function ModalHeader(props: HTMLAttributes<HTMLDivElement>) {
    return <OverlayHeader {...props} />
}

function ModalContent(props: HTMLAttributes<HTMLDivElement>) {
    return <OverlayContent {...props} />
}

function ModalFooter(props: HTMLAttributes<HTMLDivElement>) {
    return <OverlayFooter {...props} />
}

// ─── Compound Export ─────────────────────────────────────────────────

export const Modal = Object.assign(ModalRoot, {
    Trigger: ModalTrigger,
    Portal: ModalPortal,
    Backdrop: ModalBackdrop,
    Positioner: ModalPositioner,
    Panel: ModalPanel,
    Header: ModalHeader,
    Content: ModalContent,
    Footer: ModalFooter,
    Close: ModalClose,
})
