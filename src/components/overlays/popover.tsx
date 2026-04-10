import { cn } from '@/utils/cn'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type HTMLAttributes, type MouseEvent, type ReactNode } from 'react'
import { useAnchorPosition, useClickOutside, type Placement } from './overlay-primitives'
import { useOverlayStack } from './overlay-provider'

// ─── Context ─────────────────────────────────────────────────────────

type PopoverContextValue = {
    state: {
        isOpen: boolean
        zIndex: number
        placement: Placement
    }
    actions: {
        close: () => void
        open: () => void
        toggle: () => void
        setOpen: (nextOpen: boolean) => void
    }
    refs: {
        triggerRef: React.RefObject<HTMLSpanElement | null>
        panelRef: React.RefObject<HTMLDivElement | null>
    }
}

const PopoverContext = createContext<PopoverContextValue | null>(null)

export function usePopover() {
    const context = useContext(PopoverContext)

    if (!context) {
        throw new Error('usePopover must be used within a Popover.Root')
    }

    return context
}

// ─── Root ────────────────────────────────────────────────────────────

type PopoverRootProps = {
    children: ReactNode
    closeOnEscape?: boolean
    defaultOpen?: boolean
    onOpenChange?: (nextOpen: boolean) => void
    open?: boolean
    placement?: Placement
}

function PopoverRoot({ children, closeOnEscape = true, defaultOpen = false, onOpenChange, open, placement = 'bottom' }: PopoverRootProps) {
    const isControlled = open !== undefined
    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
    const triggerRef = useRef<HTMLSpanElement | null>(null)
    const panelRef = useRef<HTMLDivElement | null>(null)

    const isOpen = isControlled ? open : uncontrolledOpen

    // Lightweight: use a fixed high z-index rather than overlay stack
    const { meta: overlayMeta } = useOverlayStack()
    const zIndex = overlayMeta.baseZIndex + 50

    const setOpenState = useCallback((nextOpen: boolean) => {
        if (!isControlled) {
            setUncontrolledOpen(nextOpen)
        }

        onOpenChange?.(nextOpen)
    }, [isControlled, onOpenChange])

    const openPopover = useCallback(() => {
        setOpenState(true)
    }, [setOpenState])

    const closePopover = useCallback(() => {
        setOpenState(false)
    }, [setOpenState])

    const toggle = useCallback(() => {
        setOpenState(!isOpen)
    }, [isOpen, setOpenState])

    // Click outside to close
    useClickOutside([triggerRef, panelRef], isOpen, closePopover)

    // Escape key
    useEffect(() => {
        if (!isOpen || !closeOnEscape) {
            return undefined
        }

        function handleDocumentKeyDown(event: KeyboardEvent) {
            if (event.key !== 'Escape') {
                return
            }

            event.preventDefault()
            closePopover()
            triggerRef.current?.focus()
        }

        document.addEventListener('keydown', handleDocumentKeyDown)

        return () => {
            document.removeEventListener('keydown', handleDocumentKeyDown)
        }
    }, [closePopover, closeOnEscape, isOpen])

    const value = useMemo<PopoverContextValue>(() => ({
        state: {
            isOpen,
            zIndex,
            placement,
        },
        actions: {
            close: closePopover,
            open: openPopover,
            toggle,
            setOpen: setOpenState,
        },
        refs: {
            triggerRef,
            panelRef,
        },
    }), [closePopover, isOpen, openPopover, placement, setOpenState, toggle, zIndex])

    return (
        <PopoverContext.Provider value={value}>
            <span className="relative inline-flex">{children}</span>
        </PopoverContext.Provider>
    )
}

// ─── Trigger ─────────────────────────────────────────────────────────

function PopoverTrigger({ children, onClick, ...props }: HTMLAttributes<HTMLSpanElement>) {
    const { state, actions, refs } = usePopover()

    function handleClick(event: MouseEvent<HTMLSpanElement>) {
        onClick?.(event)

        if (event.defaultPrevented) {
            return
        }

        actions.toggle()
    }

    return (
        <span
            ref={refs.triggerRef}
            aria-expanded={state.isOpen}
            aria-haspopup="dialog"
            onClick={handleClick}
            role="button"
            tabIndex={0}
            {...props}
        >
            {children}
        </span>
    )
}

// ─── Panel ───────────────────────────────────────────────────────────

function PopoverPanel({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    const { state, refs } = usePopover()
    const position = useAnchorPosition(refs.triggerRef, refs.panelRef, state.isOpen, state.placement)

    useEffect(() => {
        if (!state.isOpen) {
            return
        }

        refs.panelRef.current?.focus()
    }, [state.isOpen, refs.panelRef])

    if (!state.isOpen) {
        return null
    }

    return (
        <div
            ref={refs.panelRef}
            className={cn(
                'fixed z-50 flex min-w-48 flex-col overflow-hidden rounded-xl border border-secondary bg-primary shadow-lg',
                className,
            )}
            role="dialog"
            style={{ top: position.top, left: position.left, zIndex: state.zIndex }}
            tabIndex={-1}
            {...props}
        >
            {children}
        </div>
    )
}

// ─── Header / Content ────────────────────────────────────────────────

function PopoverHeader({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn('flex items-center gap-2 border-b border-secondary p-3', className)} {...props}>
            {children}
        </div>
    )
}

function PopoverContent({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn('flex flex-1 flex-col overflow-y-auto p-3', className)} {...props}>
            {children}
        </div>
    )
}

// ─── Close ───────────────────────────────────────────────────────────

function PopoverClose({ children, onClick, ...props }: HTMLAttributes<HTMLSpanElement>) {
    const { actions } = usePopover()

    function handleClick(event: MouseEvent<HTMLSpanElement>) {
        onClick?.(event)

        if (event.defaultPrevented) {
            return
        }

        actions.close()
    }

    return (
        <span onClick={handleClick} role="button" {...props}>
            {children}
        </span>
    )
}

// ─── Compound Export ─────────────────────────────────────────────────

export const Popover = {
    Root: PopoverRoot,
    Trigger: PopoverTrigger,
    Panel: PopoverPanel,
    Header: PopoverHeader,
    Content: PopoverContent,
    Close: PopoverClose,
}
