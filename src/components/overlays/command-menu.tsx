import { cn } from '@/utils/cn'
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type HTMLAttributes, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import { useOverlayStack } from './overlay-provider'
import { OverlayBackdrop, OverlayClose, OverlayPortal } from './overlay-primitives'

// ─── Context ─────────────────────────────────────────────────────────

type CommandMenuContextValue = {
    state: {
        isOpen: boolean
        isTopmost: boolean
        zIndex: number
        search: string
        activeIndex: number
    }
    actions: {
        close: () => void
        open: () => void
        setOpen: (nextOpen: boolean) => void
        setSearch: (value: string) => void
        setActiveIndex: (index: number) => void
        registerItem: (id: string) => void
        unregisterItem: (id: string) => void
    }
    meta: {
        itemIds: string[]
    }
}

const CommandMenuContext = createContext<CommandMenuContextValue | null>(null)

export function useCommandMenu() {
    const context = useContext(CommandMenuContext)

    if (!context) {
        throw new Error('useCommandMenu must be used within a CommandMenu.Root')
    }

    return context
}

// ─── Root ────────────────────────────────────────────────────────────

type CommandMenuRootProps = {
    children: ReactNode
    closeOnEscape?: boolean
    defaultOpen?: boolean
    onOpenChange?: (nextOpen: boolean) => void
    open?: boolean
    shortcut?: boolean
}

function CommandMenuRoot({ children, closeOnEscape = true, defaultOpen = false, onOpenChange, open, shortcut = true }: CommandMenuRootProps) {
    const menuId = useId()
    const isControlled = open !== undefined
    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
    const [search, setSearch] = useState('')
    const [activeIndex, setActiveIndex] = useState(0)
    const [itemIds, setItemIds] = useState<string[]>([])
    const { state: overlayState, actions: overlayActions, meta: overlayMeta } = useOverlayStack()

    const isOpen = isControlled ? open : uncontrolledOpen
    const stackIndex = overlayState.stack.indexOf(menuId)
    const isTopmost = stackIndex === overlayState.stack.length - 1 && stackIndex >= 0
    const zIndex = overlayMeta.baseZIndex + Math.max(stackIndex, 0) * 10

    const setOpenState = useCallback((nextOpen: boolean) => {
        if (!isControlled) {
            setUncontrolledOpen(nextOpen)
        }

        if (!nextOpen) {
            setSearch('')
            setActiveIndex(0)
        }

        onOpenChange?.(nextOpen)
    }, [isControlled, onOpenChange])

    const openMenu = useCallback(() => {
        setOpenState(true)
    }, [setOpenState])

    const closeMenu = useCallback(() => {
        setOpenState(false)
    }, [setOpenState])

    const registerItem = useCallback((id: string) => {
        setItemIds(prev => prev.includes(id) ? prev : [...prev, id])
    }, [])

    const unregisterItem = useCallback((id: string) => {
        setItemIds(prev => prev.filter(itemId => itemId !== id))
    }, [])

    // Overlay stack registration
    useEffect(() => {
        if (!isOpen) {
            overlayActions.unregister(menuId)
            return undefined
        }

        overlayActions.register(menuId)

        return () => {
            overlayActions.unregister(menuId)
        }
    }, [isOpen, menuId, overlayActions])

    // Cmd+K / Ctrl+K shortcut
    useEffect(() => {
        if (!shortcut) {
            return
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault()
                setOpenState(!isOpen)
            }
        }

        document.addEventListener('keydown', handleKeyDown)

        return () => {
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOpen, setOpenState, shortcut])

    // Escape key
    useEffect(() => {
        if (!isOpen || !isTopmost || !closeOnEscape) {
            return undefined
        }

        function handleDocumentKeyDown(event: KeyboardEvent) {
            if (event.key !== 'Escape') {
                return
            }

            event.preventDefault()
            closeMenu()
        }

        document.addEventListener('keydown', handleDocumentKeyDown)

        return () => {
            document.removeEventListener('keydown', handleDocumentKeyDown)
        }
    }, [closeMenu, closeOnEscape, isOpen, isTopmost])

    const value = useMemo<CommandMenuContextValue>(() => ({
        state: {
            isOpen,
            isTopmost,
            zIndex,
            search,
            activeIndex,
        },
        actions: {
            close: closeMenu,
            open: openMenu,
            setOpen: setOpenState,
            setSearch,
            setActiveIndex,
            registerItem,
            unregisterItem,
        },
        meta: {
            itemIds,
        },
    }), [activeIndex, closeMenu, isOpen, isTopmost, itemIds, openMenu, registerItem, search, setOpenState, unregisterItem, zIndex])

    return (
        <CommandMenuContext.Provider value={value}>
            {children}
        </CommandMenuContext.Provider>
    )
}

// ─── Portal ──────────────────────────────────────────────────────────

function CommandMenuPortal({ children }: { children: ReactNode }) {
    const { state } = useCommandMenu()
    return <OverlayPortal isOpen={state.isOpen} zIndex={state.zIndex}>{children}</OverlayPortal>
}

// ─── Backdrop ────────────────────────────────────────────────────────

function CommandMenuBackdrop(props: HTMLAttributes<HTMLDivElement>) {
    const { actions } = useCommandMenu()
    return <OverlayBackdrop closeOnClick onClose={actions.close} {...props} />
}

// ─── Close ───────────────────────────────────────────────────────────

function CommandMenuClose(props: HTMLAttributes<HTMLSpanElement>) {
    const { actions } = useCommandMenu()
    return <OverlayClose onClose={actions.close} {...props} />
}

// ─── Panel ───────────────────────────────────────────────────────────

function CommandMenuPanel({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    const panelRef = useRef<HTMLDivElement | null>(null)
    const { state, actions, meta } = useCommandMenu()

    useEffect(() => {
        if (!state.isOpen || !state.isTopmost) {
            return
        }

        panelRef.current?.focus()
    }, [state.isOpen, state.isTopmost])

    function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
        const itemCount = meta.itemIds.length

        if (itemCount === 0) {
            return
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault()
            actions.setActiveIndex((state.activeIndex + 1) % itemCount)
        } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            actions.setActiveIndex((state.activeIndex - 1 + itemCount) % itemCount)
        } else if (event.key === 'Enter') {
            event.preventDefault()
            const activeItem = panelRef.current?.querySelector('[aria-selected="true"]') as HTMLElement | null
            activeItem?.click()
        }
    }

    return (
        <div className="pointer-events-none fixed inset-0 flex items-start justify-center p-2 pt-[20vh]">
            <div
                ref={panelRef}
                aria-modal="true"
                className={cn(
                    'pointer-events-auto flex w-full max-w-lg flex-col overflow-hidden rounded-xl border border-secondary bg-primary shadow-lg',
                    className,
                )}
                onKeyDown={handleKeyDown}
                role="dialog"
                tabIndex={-1}
                {...props}
            >
                {children}
            </div>
        </div>
    )
}

// ─── Input ───────────────────────────────────────────────────────────

type CommandMenuInputProps = Omit<HTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'>

function CommandMenuInput({ className, ...props }: CommandMenuInputProps) {
    const inputRef = useRef<HTMLInputElement | null>(null)
    const { state, actions } = useCommandMenu()

    useEffect(() => {
        if (state.isOpen && state.isTopmost) {
            inputRef.current?.focus()
        }
    }, [state.isOpen, state.isTopmost])

    return (
        <input
            ref={inputRef}
            className={cn('w-full border-b border-secondary bg-transparent px-4 py-3 text-sm text-primary outline-none placeholder:text-quaternary', className)}
            onChange={event => {
                actions.setSearch(event.target.value)
                actions.setActiveIndex(0)
            }}
            placeholder="Search..."
            type="text"
            value={state.search}
            {...props}
        />
    )
}

// ─── List ────────────────────────────────────────────────────────────

function CommandMenuList({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn('flex max-h-72 flex-col overflow-y-auto p-1', className)} role="listbox" {...props}>
            {children}
        </div>
    )
}

// ─── Group ───────────────────────────────────────────────────────────

type CommandMenuGroupProps = HTMLAttributes<HTMLDivElement> & {
    heading?: string
}

function CommandMenuGroup({ children, className, heading, ...props }: CommandMenuGroupProps) {
    return (
        <div className={cn('flex flex-col', className)} role="group" {...props}>
            {heading && (
                <div className="px-3 py-1.5 text-xs text-quaternary">{heading}</div>
            )}
            {children}
        </div>
    )
}

// ─── Item ────────────────────────────────────────────────────────────

type CommandMenuItemProps = HTMLAttributes<HTMLDivElement> & {
    onSelect?: () => void
    value?: string
}

function CommandMenuItem({ children, className, onClick, onSelect, value, ...props }: CommandMenuItemProps) {
    const itemId = useId()
    const { state, actions, meta } = useCommandMenu()
    const itemIndex = meta.itemIds.indexOf(itemId)
    const isActive = itemIndex === state.activeIndex

    useEffect(() => {
        actions.registerItem(itemId)

        return () => {
            actions.unregisterItem(itemId)
        }
    }, [actions, itemId])

    function handleClick(event: React.MouseEvent<HTMLDivElement>) {
        onClick?.(event)

        if (event.defaultPrevented) {
            return
        }

        onSelect?.()
        actions.close()
    }

    function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
        if (event.key === 'Enter') {
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
            data-value={value}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            onPointerMove={() => actions.setActiveIndex(itemIndex)}
            role="option"
            {...props}
        >
            {children}
        </div>
    )
}

// ─── Empty ───────────────────────────────────────────────────────────

function CommandMenuEmpty({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn('px-4 py-6 text-center text-sm text-quaternary', className)} {...props}>
            {children ?? 'No results found.'}
        </div>
    )
}

// ─── Compound Export ─────────────────────────────────────────────────

export const CommandMenu = {
    Root: CommandMenuRoot,
    Portal: CommandMenuPortal,
    Backdrop: CommandMenuBackdrop,
    Panel: CommandMenuPanel,
    Input: CommandMenuInput,
    List: CommandMenuList,
    Group: CommandMenuGroup,
    Item: CommandMenuItem,
    Empty: CommandMenuEmpty,
    Close: CommandMenuClose,
}
