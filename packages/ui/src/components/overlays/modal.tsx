import { Dialog } from '@base-ui/react/dialog'
import { cn } from '@moc/utils/cn'
import { createContext, useCallback, useContext, useMemo, useState, type HTMLAttributes, type ReactNode } from 'react'
import { useOverlayStack } from './overlay-provider'
import { OverlayContent, OverlayFooter, OverlayHeader } from './overlay-primitives'

// ─── Context ─────────────────────────────────────────────────────────
//
// Base UI's Dialog owns focus-trapping, scroll-lock and dismissal. We keep a
// thin context (controlling Base UI via `open`/`onOpenChange`) so the public
// `useModal()` contract — { state, actions, meta } — is preserved.

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
    const isControlled = open !== undefined
    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
    const isOpen = isControlled ? open : uncontrolledOpen

    const setOpen = useCallback((nextOpen: boolean) => {
        if (!isControlled) {
            setUncontrolledOpen(nextOpen)
        }
        onOpenChange?.(nextOpen)
    }, [isControlled, onOpenChange])

    const value = useMemo<ModalContextValue>(() => ({
        state: { isOpen, isTopmost: true, zIndex: 9000 },
        actions: {
            close: () => setOpen(false),
            open: () => setOpen(true),
            setOpen,
        },
        meta: { closeOnBackdropClick },
    }), [closeOnBackdropClick, isOpen, setOpen])

    return (
        <ModalContext.Provider value={value}>
            <Dialog.Root
                open={isOpen}
                onOpenChange={(nextOpen, eventDetails) => {
                    if (!nextOpen) {
                        if (!closeOnEscape && eventDetails.reason === 'escape-key') return
                        if (!closeOnBackdropClick && eventDetails.reason === 'outside-press') return
                    }
                    setOpen(nextOpen)
                }}
            >
                {children}
            </Dialog.Root>
        </ModalContext.Provider>
    )
}

// ─── Trigger ─────────────────────────────────────────────────────────

function ModalTrigger({ children, className, ...props }: HTMLAttributes<HTMLSpanElement>) {
    return (
        <Dialog.Trigger nativeButton={false} render={<span />} className={cn('contents', className)} {...props}>
            {children}
        </Dialog.Trigger>
    )
}

// ─── Close ───────────────────────────────────────────────────────────

function ModalClose({ children, className, ...props }: HTMLAttributes<HTMLSpanElement>) {
    return (
        <Dialog.Close nativeButton={false} render={<span />} className={cn('contents', className)} {...props}>
            {children}
        </Dialog.Close>
    )
}

// ─── Portal ──────────────────────────────────────────────────────────

function ModalPortal({ children }: { children: ReactNode }) {
    const { state: overlayState } = useOverlayStack()
    return <Dialog.Portal container={overlayState.rootElement ?? undefined}>{children}</Dialog.Portal>
}

// ─── Backdrop ────────────────────────────────────────────────────────

function ModalBackdrop({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <Dialog.Backdrop
            className={cn(
                'pointer-events-auto fixed inset-0 bg-linear-to-t from-black/30 to-black/3 backdrop-blur-xs',
                'transition-opacity duration-200 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0',
                className,
            )}
            {...props}
        />
    )
}

// ─── Positioner ──────────────────────────────────────────────────────

function ModalPositioner({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    // Outer padding is max(0.5rem, env(safe-area-inset-*)) so the panel keeps
    // its baseline 8px gap on desktop but never overlaps the status bar or
    // gesture indicator on PWA mobile installs (edge-to-edge mode).
    return (
        <div
            className={cn(
                'pointer-events-none fixed inset-0 flex items-center justify-center',
                'pt-[max(0.5rem,env(safe-area-inset-top))]',
                'pr-[max(0.5rem,env(safe-area-inset-right))]',
                'pb-[max(0.5rem,env(safe-area-inset-bottom))]',
                'pl-[max(0.5rem,env(safe-area-inset-left))]',
                className,
            )}
            {...props}
        >
            {children}
        </div>
    )
}

// ─── Panel ───────────────────────────────────────────────────────────

function ModalPanel({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <Dialog.Popup
            className={cn(
                'pointer-events-auto flex w-full max-w-md flex-col rounded-xl border border-secondary bg-primary',
                'origin-center transition-[opacity,transform] duration-200',
                'data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
                'data-[ending-style]:scale-95 data-[ending-style]:opacity-0',
                className,
            )}
            {...props}
        >
            {children}
        </Dialog.Popup>
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
