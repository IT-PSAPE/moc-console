import { cn } from '@/utils/cn'
import { createPortal } from 'react-dom'
import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useState, type CSSProperties, type HTMLAttributes, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { useAnchorPosition, useClickOutside, type Placement } from './overlay-primitives'
import { useOverlayStack } from './overlay-provider'

// ─── Context ─────────────────────────────────────────────────────────

type DropdownContextValue = {
    state: {
        isOpen: boolean
        zIndex: number
        activeIndex: number
        placement: Placement
    }
    actions: {
        close: () => void
        open: () => void
        toggle: () => void
        setActiveIndex: (index: number) => void
        registerItem: (id: string) => void
        setPanelElement: (node: HTMLDivElement | null) => void
        setTriggerElement: (node: HTMLSpanElement | null) => void
        unregisterItem: (id: string) => void
    }
    elements: {
        triggerElement: HTMLSpanElement | null
        panelElement: HTMLDivElement | null
    }
    meta: {
        itemIds: string[]
    }
}

const DropdownContext = createContext<DropdownContextValue | null>(null)

export function useDropdown() {
    const context = useContext(DropdownContext)

    if (!context) {
        throw new Error('useDropdown must be used within a Dropdown.Root')
    }

    return context
}

// ─── Root ────────────────────────────────────────────────────────────

type DropdownRootProps = {
    children: ReactNode
    closeOnEscape?: boolean
    defaultOpen?: boolean
    onOpenChange?: (nextOpen: boolean) => void
    open?: boolean
    placement?: Placement
}

function DropdownRoot({ children, closeOnEscape = true, defaultOpen = false, onOpenChange, open, placement = 'bottom' }: DropdownRootProps) {
    const isControlled = open !== undefined
    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
    const [activeIndex, setActiveIndex] = useState(-1)
    const [itemIds, setItemIds] = useState<string[]>([])
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

        if (!nextOpen) {
            setActiveIndex(-1)
        }

        onOpenChange?.(nextOpen)
    }, [isControlled, onOpenChange])

    const openDropdown = useCallback(() => {
        setOpenState(true)
    }, [setOpenState])

    const closeDropdown = useCallback(() => {
        setOpenState(false)
    }, [setOpenState])

    const toggle = useCallback(() => {
        setOpenState(!isOpen)
    }, [isOpen, setOpenState])

    const registerItem = useCallback((id: string) => {
        setItemIds(prev => prev.includes(id) ? prev : [...prev, id])
    }, [])

    const setTriggerElement = useCallback((node: HTMLSpanElement | null) => {
        setTriggerElementState(node)
    }, [])

    const setPanelElement = useCallback((node: HTMLDivElement | null) => {
        setPanelElementState(node)
    }, [])

    const unregisterItem = useCallback((id: string) => {
        setItemIds(prev => {
            const next = prev.filter(itemId => itemId !== id)
            return next.length === prev.length ? prev : next
        })
    }, [])

    // Click outside to close
    useClickOutside([triggerElement, panelElement], isOpen, closeDropdown)

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
            closeDropdown()
            triggerElement?.focus()
        }

        document.addEventListener('keydown', handleDocumentKeyDown)

        return () => {
            document.removeEventListener('keydown', handleDocumentKeyDown)
        }
    }, [closeDropdown, closeOnEscape, isOpen, triggerElement])

    const state = useMemo<DropdownContextValue['state']>(() => ({
        isOpen,
        zIndex,
        activeIndex,
        placement,
    }), [activeIndex, isOpen, placement, zIndex])

    const actions = useMemo<DropdownContextValue['actions']>(() => ({
        close: closeDropdown,
        open: openDropdown,
        toggle,
        setActiveIndex,
        registerItem,
        setPanelElement,
        setTriggerElement,
        unregisterItem,
    }), [closeDropdown, openDropdown, registerItem, setPanelElement, setTriggerElement, toggle, unregisterItem])

    const elements = useMemo<DropdownContextValue['elements']>(() => ({
        triggerElement,
        panelElement,
    }), [panelElement, triggerElement])

    const meta = useMemo<DropdownContextValue['meta']>(() => ({
        itemIds,
    }), [itemIds])

    const value = useMemo<DropdownContextValue>(() => ({
        state,
        actions,
        elements,
        meta,
    }), [actions, elements, meta, state])

    return (
        <DropdownContext.Provider value={value}>
            <span className="relative inline-flex">{children}</span>
        </DropdownContext.Provider>
    )
}

// ─── Trigger ─────────────────────────────────────────────────────────

function DropdownTrigger({ children, onClick, ...props }: HTMLAttributes<HTMLSpanElement>) {
    const { state, actions } = useDropdown()
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

    function handleKeyDown(event: ReactKeyboardEvent<HTMLSpanElement>) {
        if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()

            if (!state.isOpen) {
                actions.open()
            }

            actions.setActiveIndex(0)
        }
    }

    return (
        <span
            ref={handleTriggerRef}
            aria-expanded={state.isOpen}
            aria-haspopup="menu"
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            role="button"
            tabIndex={0}
            {...props}
        >
            {children}
        </span>
    )
}

// ─── Panel ───────────────────────────────────────────────────────────

type DropdownPanelProps = HTMLAttributes<HTMLDivElement> & {
    matchTriggerWidth?: boolean
}

function DropdownPanel({ children, className, style, matchTriggerWidth = false, ...props }: DropdownPanelProps) {
    const { state, actions, elements, meta } = useDropdown()
    const { state: overlayState } = useOverlayStack()
    const position = useAnchorPosition(elements.triggerElement, elements.panelElement, state.isOpen, state.placement)
    const [triggerWidth, setTriggerWidth] = useState<number | null>(null)
    const handlePanelRef = useCallback((node: HTMLDivElement | null) => {
        actions.setPanelElement(node)
    }, [actions])

    useLayoutEffect(() => {
        const trigger = elements.triggerElement

        if (!matchTriggerWidth || !state.isOpen || !trigger) {
            setTriggerWidth(null)
            return undefined
        }

        setTriggerWidth(trigger.getBoundingClientRect().width)

        if (typeof ResizeObserver === 'undefined') {
            return undefined
        }

        const observer = new ResizeObserver(() => {
            setTriggerWidth(trigger.getBoundingClientRect().width)
        })

        observer.observe(trigger)

        return () => {
            observer.disconnect()
        }
    }, [elements.triggerElement, matchTriggerWidth, state.isOpen])

    if (!state.isOpen) {
        return null
    }

    function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
        const itemCount = meta.itemIds.length

        if (itemCount === 0) {
            return
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault()
            actions.setActiveIndex(state.activeIndex < 0 ? 0 : (state.activeIndex + 1) % itemCount)
        } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            actions.setActiveIndex(state.activeIndex < 0 ? itemCount - 1 : (state.activeIndex - 1 + itemCount) % itemCount)
        }
    }

    const panelStyle: CSSProperties = {
        top: position.top,
        left: position.left,
        zIndex: state.zIndex,
        maxWidth: position.maxWidth,
        maxHeight: position.maxHeight,
        visibility: position.isPositioned ? 'visible' : 'hidden',
        ...(matchTriggerWidth && triggerWidth !== null
            ? { width: triggerWidth, minWidth: triggerWidth }
            : null),
        ...style,
    }

    const panel = (
        <div
            ref={handlePanelRef}
            className={cn(
                'pointer-events-auto fixed z-50 flex flex-col overflow-x-hidden overflow-y-auto rounded-md border border-secondary bg-primary p-1 shadow-lg',
                matchTriggerWidth ? 'max-w-[calc(100vw-1rem)]' : 'min-w-48 max-w-[calc(100vw-1rem)]',
                className,
            )}
            onKeyDown={handleKeyDown}
            role="menu"
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

// ─── Item ────────────────────────────────────────────────────────────

type DropdownItemProps = HTMLAttributes<HTMLDivElement> & {
    onSelect?: () => void
}

function DropdownItem({ children, className, onClick, onSelect, ...props }: DropdownItemProps) {
    const itemId = useId()
    const { state, actions, meta } = useDropdown()
    const itemIndex = meta.itemIds.indexOf(itemId)
    const isActive = itemIndex === state.activeIndex

    useEffect(() => {
        actions.registerItem(itemId)

        return () => {
            actions.unregisterItem(itemId)
        }
    }, [actions, itemId])

    function handleClick(event: MouseEvent<HTMLDivElement>) {
        onClick?.(event)

        if (event.defaultPrevented) {
            return
        }

        onSelect?.()
        actions.close()
    }

    function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onSelect?.()
            actions.close()
        }
    }

    return (
        <div
            aria-selected={isActive}
            className={cn(
                'h-8 flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-secondary',
                isActive && 'bg-secondary text-primary',
                className,
            )}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            onPointerMove={() => actions.setActiveIndex(itemIndex)}
            role="menuitem"
            tabIndex={-1}
            {...props}
        >
            {children}
        </div>
    )
}

// ─── Separator ───────────────────────────────────────────────────────

function DropdownSeparator({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn('my-1 h-px bg-secondary', className)} role="separator" {...props} />
    )
}

// ─── Close ───────────────────────────────────────────────────────────

function DropdownClose({ children, onClick, ...props }: HTMLAttributes<HTMLSpanElement>) {
    const { actions } = useDropdown()

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

export const Dropdown = {
    Root: DropdownRoot,
    Trigger: DropdownTrigger,
    Panel: DropdownPanel,
    Item: DropdownItem,
    Separator: DropdownSeparator,
    Close: DropdownClose,
}
