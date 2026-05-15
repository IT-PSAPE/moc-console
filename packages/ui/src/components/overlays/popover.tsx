import { cn } from '@moc/utils/cn'
import { createPortal } from 'react-dom'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type CSSProperties, type HTMLAttributes, type MouseEvent, type ReactNode } from 'react'
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
        setPanelElement: (node: HTMLDivElement | null) => void
        setTriggerElement: (node: HTMLSpanElement | null) => void
    }
    elements: {
        triggerElement: HTMLSpanElement | null
        panelElement: HTMLDivElement | null
    }
}

const PopoverContext = createContext<PopoverContextValue | null>(null)

export function usePopover() {
    const context = useContext(PopoverContext)

    if (!context) {
        throw new Error('usePopover must be used within a Popover')
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
    const [triggerElement, setTriggerElementState] = useState<HTMLSpanElement | null>(null)
    const [panelElement, setPanelElementState] = useState<HTMLDivElement | null>(null)

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

    const setTriggerElement = useCallback((node: HTMLSpanElement | null) => {
        setTriggerElementState(node)
    }, [])

    const setPanelElement = useCallback((node: HTMLDivElement | null) => {
        setPanelElementState(node)
    }, [])

    // Click outside to close
    useClickOutside([triggerElement, panelElement], isOpen, closePopover)

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
            triggerElement?.focus()
        }

        document.addEventListener('keydown', handleDocumentKeyDown)

        return () => {
            document.removeEventListener('keydown', handleDocumentKeyDown)
        }
    }, [closePopover, closeOnEscape, isOpen, triggerElement])

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
            setPanelElement,
            setTriggerElement,
        },
        elements: {
            triggerElement,
            panelElement,
        },
    }), [closePopover, isOpen, openPopover, panelElement, placement, setOpenState, setPanelElement, setTriggerElement, toggle, triggerElement, zIndex])

    return (
        <PopoverContext.Provider value={value}>
            <span className="relative inline-flex">{children}</span>
        </PopoverContext.Provider>
    )
}

// ─── Trigger ─────────────────────────────────────────────────────────

function PopoverTrigger({ children, onClick, ...props }: HTMLAttributes<HTMLSpanElement>) {
    const { state, actions } = usePopover()
    const handleTriggerRef = useCallback((node: HTMLSpanElement | null) => {
        actions.setTriggerElement(node)
    }, [actions])

    function handleClick(event: MouseEvent<HTMLSpanElement>) {
        onClick?.(event)

        if (event.defaultPrevented) {
            return
        }

        actions.toggle()
    }

    return (
        <span
            ref={handleTriggerRef}
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

function PopoverPanel({ children, className, style, ...props }: HTMLAttributes<HTMLDivElement>) {
    const { state, actions, elements } = usePopover()
    const { state: overlayState } = useOverlayStack()
    const position = useAnchorPosition(elements.triggerElement, elements.panelElement, state.isOpen, state.placement)
    const handlePanelRef = useCallback((node: HTMLDivElement | null) => {
        actions.setPanelElement(node)
    }, [actions])

    useEffect(() => {
        if (!state.isOpen) {
            return
        }

        elements.panelElement?.focus()
    }, [elements.panelElement, state.isOpen])

    if (!state.isOpen) {
        return null
    }

    const panelStyle: CSSProperties = {
        top: position.top,
        left: position.left,
        zIndex: state.zIndex,
        maxWidth: position.maxWidth,
        maxHeight: position.maxHeight,
        visibility: position.isPositioned ? 'visible' : 'hidden',
        ...style,
    }

    const panel = (
        <div
            ref={handlePanelRef}
            className={cn(
                'pointer-events-auto fixed z-50 flex min-w-48 max-w-[calc(100vw-1rem)] flex-col overflow-x-hidden overflow-y-auto rounded-xl border border-secondary bg-primary shadow-lg',
                className,
            )}
            role="dialog"
            style={panelStyle}
            tabIndex={-1}
            {...props}
        >
            {children}
        </div>
    )

    if (!overlayState.rootElement) {
        return panel
    }

    return createPortal(panel, overlayState.rootElement)
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
        <div className={cn('min-h-0 flex flex-1 flex-col overflow-y-auto p-3', className)} {...props}>
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

export const Popover = Object.assign(PopoverRoot, {
    Trigger: PopoverTrigger,
    Panel: PopoverPanel,
    Header: PopoverHeader,
    Content: PopoverContent,
    Close: PopoverClose,
})
