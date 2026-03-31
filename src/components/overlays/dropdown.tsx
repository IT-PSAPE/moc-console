import { cn } from '@/utils/cn'
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type HTMLAttributes, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent, type ReactNode } from 'react'
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
        unregisterItem: (id: string) => void
    }
    refs: {
        triggerRef: React.RefObject<HTMLSpanElement | null>
        panelRef: React.RefObject<HTMLDivElement | null>
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

    const unregisterItem = useCallback((id: string) => {
        setItemIds(prev => {
            const next = prev.filter(itemId => itemId !== id)
            return next.length === prev.length ? prev : next
        })
    }, [])

    // Click outside to close
    useClickOutside([triggerRef, panelRef], isOpen, closeDropdown)

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
            triggerRef.current?.focus()
        }

        document.addEventListener('keydown', handleDocumentKeyDown)

        return () => {
            document.removeEventListener('keydown', handleDocumentKeyDown)
        }
    }, [closeDropdown, closeOnEscape, isOpen])

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
        unregisterItem,
    }), [closeDropdown, openDropdown, registerItem, toggle, unregisterItem])

    const refs = useMemo<DropdownContextValue['refs']>(() => ({
        triggerRef,
        panelRef,
    }), [])

    const meta = useMemo<DropdownContextValue['meta']>(() => ({
        itemIds,
    }), [itemIds])

    const value = useMemo<DropdownContextValue>(() => ({
        state,
        actions,
        refs,
        meta,
    }), [actions, meta, refs, state])

    return (
        <DropdownContext.Provider value={value}>
            <span className="relative inline-flex">{children}</span>
        </DropdownContext.Provider>
    )
}

// ─── Trigger ─────────────────────────────────────────────────────────

function DropdownTrigger({ children, onClick, ...props }: HTMLAttributes<HTMLSpanElement>) {
    const { state, actions, refs } = useDropdown()

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
            ref={refs.triggerRef}
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

function DropdownPanel({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    const { state, actions, refs, meta } = useDropdown()
    const position = useAnchorPosition(refs.triggerRef, refs.panelRef, state.isOpen, state.placement)

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

    return (
        <div
            ref={refs.panelRef}
            className={cn(
                'fixed z-50 flex min-w-48 flex-col overflow-hidden rounded-xl border border-secondary bg-primary p-1 shadow-lg',
                className,
            )}
            onKeyDown={handleKeyDown}
            role="menu"
            style={{ top: position.top, left: position.left, zIndex: state.zIndex }}
            tabIndex={-1}
            {...props}
        >
            {children}
        </div>
    )
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
                'flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-secondary',
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
