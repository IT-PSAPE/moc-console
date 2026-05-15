import { cn } from '@/utils/cn'
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type HTMLAttributes, type ReactNode } from 'react'
import { useOverlayStack } from './overlay-provider'
import { OverlayBackdrop, OverlayClose, OverlayContent, OverlayFooter, OverlayHeader, OverlayPortal, OverlayTrigger } from './overlay-primitives'

// ─── Context ─────────────────────────────────────────────────────────

type Side = 'left' | 'right' | 'top' | 'bottom'

type DrawerContextValue = {
    state: {
        isOpen: boolean
        isTopmost: boolean
        zIndex: number
        side: Side
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

const DrawerContext = createContext<DrawerContextValue | null>(null)

export function useDrawer() {
    const context = useContext(DrawerContext)

    if (!context) {
        throw new Error('useDrawer must be used within a Drawer')
    }

    return context
}

// ─── Root ────────────────────────────────────────────────────────────

type DrawerRootProps = {
    children: ReactNode
    closeOnBackdropClick?: boolean
    closeOnEscape?: boolean
    defaultOpen?: boolean
    onOpenChange?: (nextOpen: boolean) => void
    open?: boolean
    side?: Side
}

function DrawerRoot({ children, closeOnBackdropClick = true, closeOnEscape = true, defaultOpen = false, onOpenChange, open, side = 'right' }: DrawerRootProps) {
    const drawerId = useId()
    const isControlled = open !== undefined
    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
    const { state: overlayState, actions: overlayActions, meta: overlayMeta } = useOverlayStack()

    const isOpen = isControlled ? open : uncontrolledOpen
    const stackIndex = overlayState.stack.indexOf(drawerId)
    const isTopmost = stackIndex === overlayState.stack.length - 1 && stackIndex >= 0
    const zIndex = overlayMeta.baseZIndex + Math.max(stackIndex, 0) * 10

    const setOpenState = useCallback((nextOpen: boolean) => {
        if (!isControlled) {
            setUncontrolledOpen(nextOpen)
        }

        onOpenChange?.(nextOpen)
    }, [isControlled, onOpenChange])

    const openDrawer = useCallback(() => {
        setOpenState(true)
    }, [setOpenState])

    const closeDrawer = useCallback(() => {
        setOpenState(false)
    }, [setOpenState])

    useEffect(() => {
        if (!isOpen) {
            return undefined
        }

        overlayActions.register(drawerId)

        return () => {
            overlayActions.unregister(drawerId)
        }
    }, [isOpen, drawerId, overlayActions])

    useEffect(() => {
        if (!isOpen || !isTopmost || !closeOnEscape) {
            return undefined
        }

        function handleDocumentKeyDown(event: KeyboardEvent) {
            if (event.key !== 'Escape') {
                return
            }

            event.preventDefault()
            closeDrawer()
        }

        document.addEventListener('keydown', handleDocumentKeyDown)

        return () => {
            document.removeEventListener('keydown', handleDocumentKeyDown)
        }
    }, [closeDrawer, closeOnEscape, isOpen, isTopmost])

    const value = useMemo<DrawerContextValue>(() => ({
        state: {
            isOpen,
            isTopmost,
            zIndex,
            side,
        },
        actions: {
            close: closeDrawer,
            open: openDrawer,
            setOpen: setOpenState,
        },
        meta: {
            closeOnBackdropClick,
        },
    }), [closeDrawer, closeOnBackdropClick, isOpen, isTopmost, openDrawer, setOpenState, side, zIndex])

    return (
        <DrawerContext.Provider value={value}>
            {children}
        </DrawerContext.Provider>
    )
}

// ─── Trigger ─────────────────────────────────────────────────────────

function DrawerTrigger(props: HTMLAttributes<HTMLSpanElement>) {
    const { actions } = useDrawer()
    return <OverlayTrigger onOpen={actions.open} {...props} />
}

// ─── Close ───────────────────────────────────────────────────────────

function DrawerClose(props: HTMLAttributes<HTMLSpanElement>) {
    const { actions } = useDrawer()
    return <OverlayClose onClose={actions.close} {...props} />
}

// ─── Portal ──────────────────────────────────────────────────────────

function DrawerPortal({ children }: { children: ReactNode }) {
    const { state } = useDrawer()
    return <OverlayPortal isOpen={state.isOpen} zIndex={state.zIndex}>{children}</OverlayPortal>
}

// ─── Backdrop ────────────────────────────────────────────────────────

function DrawerBackdrop(props: HTMLAttributes<HTMLDivElement>) {
    const { actions, meta } = useDrawer()
    return <OverlayBackdrop closeOnClick={meta.closeOnBackdropClick} onClose={actions.close} {...props} />
}

// ─── Panel ───────────────────────────────────────────────────────────

const panelClassesBySide: Record<Side, string> = {
    left: 'inset-y-0 left-0 w-full max-w-md',
    right: 'inset-y-0 right-0 w-full max-w-md',
    top: 'inset-x-0 top-0 h-auto max-h-[80vh]',
    bottom: 'inset-x-0 bottom-0 h-auto max-h-[80vh]',
}

function DrawerPanel({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    const panelRef = useRef<HTMLDivElement | null>(null)
    const { state } = useDrawer()

    useEffect(() => {
        if (!state.isOpen || !state.isTopmost) {
            return
        }

        panelRef.current?.focus()
    }, [state.isOpen, state.isTopmost])

    return (
        <div ref={panelRef} aria-modal="true" className={cn('p-2 fixed w-full', panelClassesBySide[state.side], className)} role="dialog" tabIndex={-1} {...props}>
            <div className={cn('h-full pointer-events-auto flex flex-col border border-secondary bg-primary rounded-lg')}>
                {children}
            </div>
        </div>
    )
}

// ─── Header / Content / Footer ───────────────────────────────────────

function DrawerHeader(props: HTMLAttributes<HTMLDivElement>) {
    return <OverlayHeader {...props} />
}

function DrawerContent(props: HTMLAttributes<HTMLDivElement>) {
    return <OverlayContent {...props} />
}

function DrawerFooter(props: HTMLAttributes<HTMLDivElement>) {
    return <OverlayFooter {...props} />
}

// ─── Compound Export ─────────────────────────────────────────────────

export const Drawer = Object.assign(DrawerRoot, {
    Trigger: DrawerTrigger,
    Portal: DrawerPortal,
    Backdrop: DrawerBackdrop,
    Panel: DrawerPanel,
    Header: DrawerHeader,
    Content: DrawerContent,
    Footer: DrawerFooter,
    Close: DrawerClose,
})
