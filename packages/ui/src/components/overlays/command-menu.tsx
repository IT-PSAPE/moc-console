import { Combobox as BaseCombobox } from '@base-ui/react/combobox'
import { Dialog } from '@base-ui/react/dialog'
import { cn } from '@moc/utils/cn'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ComponentProps, type HTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { useIsMobile } from '../../hooks/use-is-mobile'
import { MobileSheetHandle, mobileSheetPopupClassName, mobileSheetPositionerClassName } from './mobile-sheet'
import { useOverlayRegistration, useOverlayStack } from './overlay-provider'

type CommandMenuContextValue = {
    state: {
        isOpen: boolean
        search: string
    }
    actions: {
        close: () => void
        open: () => void
        setOpen: (nextOpen: boolean) => void
        setSearch: (value: string) => void
    }
}

const CommandMenuContext = createContext<CommandMenuContextValue | null>(null)

export function useCommandMenu() {
    const context = useContext(CommandMenuContext)

    if (!context) {
        throw new Error('useCommandMenu must be used within a CommandMenu')
    }

    return context
}

type CommandMenuRootProps = {
    children: ReactNode
    closeOnEscape?: boolean
    defaultOpen?: boolean
    onOpenChange?: (nextOpen: boolean) => void
    open?: boolean
    shortcut?: boolean
}

function CommandMenuRoot({ children, closeOnEscape = true, defaultOpen = false, onOpenChange, open, shortcut = true }: CommandMenuRootProps) {
    const isControlled = open !== undefined
    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
    const [search, setSearch] = useState('')
    const isOpen = isControlled ? open : uncontrolledOpen
    useOverlayRegistration(isOpen)

    const setOpen = useCallback((nextOpen: boolean) => {
        if (!isControlled) setUncontrolledOpen(nextOpen)
        if (!nextOpen) setSearch('')
        onOpenChange?.(nextOpen)
    }, [isControlled, onOpenChange])

    const openMenu = useCallback(() => {
        setOpen(true)
    }, [setOpen])

    const closeMenu = useCallback(() => {
        setOpen(false)
    }, [setOpen])

    useEffect(() => {
        if (!shortcut) return undefined

        function handleShortcut(event: KeyboardEvent) {
            if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault()
                setOpen(!isOpen)
            }
        }

        document.addEventListener('keydown', handleShortcut)
        return () => document.removeEventListener('keydown', handleShortcut)
    }, [isOpen, setOpen, shortcut])

    const value = useMemo<CommandMenuContextValue>(() => ({
        state: { isOpen, search },
        actions: { close: closeMenu, open: openMenu, setOpen, setSearch },
    }), [closeMenu, isOpen, openMenu, search, setOpen])

    function handleDialogOpenChange(nextOpen: boolean, eventDetails: Dialog.Root.ChangeEventDetails) {
        if (!nextOpen && !closeOnEscape && eventDetails.reason === 'escape-key') return
        setOpen(nextOpen)
    }

    return (
        <CommandMenuContext.Provider value={value}>
            <Dialog.Root open={isOpen} onOpenChange={handleDialogOpenChange}>
                {children}
            </Dialog.Root>
        </CommandMenuContext.Provider>
    )
}

function CommandMenuPortal({ children }: { children: ReactNode }) {
    const { state: overlayState } = useOverlayStack()
    return <Dialog.Portal container={overlayState.rootElement ?? undefined}>{children}</Dialog.Portal>
}

function CommandMenuBackdrop({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <Dialog.Backdrop
            className={cn(
                'pointer-events-auto fixed inset-0 bg-black/30 backdrop-blur-xs transition-opacity duration-150',
                'data-[starting-style]:opacity-0 data-[ending-style]:opacity-0',
                className,
            )}
            {...props}
        />
    )
}

function CommandMenuPanel({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    const isMobile = useIsMobile()
    const { state, actions } = useCommandMenu()

    function handleInputValueChange(value: string) {
        actions.setSearch(value)
    }

    return (
        <div className={isMobile ? mobileSheetPositionerClassName : 'pointer-events-none fixed inset-0 flex items-start justify-center p-2 pt-[20vh]'}>
            <Dialog.Popup
                className={cn(
                    isMobile
                        ? cn(mobileSheetPopupClassName, 'h-[calc(100dvh-max(0.5rem,env(safe-area-inset-top)))]')
                        : cn(
                            'pointer-events-auto flex w-full max-w-lg flex-col overflow-hidden rounded-xl border border-secondary bg-primary shadow-lg outline-none',
                            'origin-center transition-[opacity,transform] duration-150',
                            'data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
                            'data-[ending-style]:scale-95 data-[ending-style]:opacity-0',
                        ),
                    className,
                )}
                {...props}
            >
                {isMobile ? <MobileSheetHandle /> : null}
                <BaseCombobox.Root open inputValue={state.search} onInputValueChange={handleInputValueChange} filter={null} autoHighlight>
                    {children}
                </BaseCombobox.Root>
            </Dialog.Popup>
        </div>
    )
}

type CommandMenuInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'>

function CommandMenuInput({ className, ...props }: CommandMenuInputProps) {
    return (
        <BaseCombobox.Input
            className={cn('w-full border-b border-secondary bg-transparent px-4 py-3 text-sm text-primary outline-none placeholder:text-quaternary focus:!outline-none focus-visible:!outline-none', className)}
            type="text"
            {...props}
        />
    )
}

type Styled<Props> = Omit<Props, 'className'> & { className?: string }

function CommandMenuList({ className, ...props }: Styled<ComponentProps<typeof BaseCombobox.List>>) {
    return <BaseCombobox.List className={cn('flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-1 outline-none md:max-h-72 md:flex-none', className)} {...props} />
}

type CommandMenuGroupProps = Styled<ComponentProps<typeof BaseCombobox.Group>> & {
    heading?: string
}

function CommandMenuGroup({ children, className, heading, ...props }: CommandMenuGroupProps) {
    return (
        <BaseCombobox.Group className={cn('flex flex-col', className)} {...props}>
            {heading ? <BaseCombobox.GroupLabel className="px-3 py-1.5 text-xs text-quaternary">{heading}</BaseCombobox.GroupLabel> : null}
            {children}
        </BaseCombobox.Group>
    )
}

type CommandMenuItemProps = Styled<ComponentProps<typeof BaseCombobox.Item>> & {
    onSelect?: () => void
}
type CommandMenuItemClickEvent = Parameters<NonNullable<ComponentProps<typeof BaseCombobox.Item>['onClick']>>[0]

function CommandMenuItem({ children, className, onClick, onSelect, ...props }: CommandMenuItemProps) {
    const { actions } = useCommandMenu()

    function handleClick(event: CommandMenuItemClickEvent) {
        onClick?.(event)
        if (event.defaultPrevented) return
        onSelect?.()
        actions.close()
    }

    return (
        <BaseCombobox.Item
            className={cn(
                'flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm text-secondary outline-none md:min-h-0 md:px-3',
                'data-[highlighted]:bg-secondary data-[highlighted]:text-primary',
                className,
            )}
            onClick={handleClick}
            {...props}
        >
            {children}
        </BaseCombobox.Item>
    )
}

function CommandMenuEmpty({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('px-4 py-6 text-center text-sm text-quaternary', className)} {...props}>{children ?? 'No results found.'}</div>
}

export const CommandMenu = {
    Backdrop: CommandMenuBackdrop,
    Empty: CommandMenuEmpty,
    Group: CommandMenuGroup,
    Input: CommandMenuInput,
    Item: CommandMenuItem,
    List: CommandMenuList,
    Panel: CommandMenuPanel,
    Portal: CommandMenuPortal,
    Root: CommandMenuRoot,
}
