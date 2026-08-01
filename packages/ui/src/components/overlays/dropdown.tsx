import { Menu } from '@base-ui/react/menu'
import { cn } from '@moc/utils/cn'
import { createContext, useContext, useState, type ComponentProps, type HTMLAttributes, type ReactElement, type ReactNode } from 'react'
import { useOverlayStack } from './overlay-provider'

// ─── Placement ───────────────────────────────────────────────────────
//
// Preserves the historical `placement` prop shape and maps it onto Base UI's
// Floating-UI-based `side` + `align` props on the Positioner.

type Placement =
    | 'top' | 'top-start' | 'top-end'
    | 'bottom' | 'bottom-start' | 'bottom-end'
    | 'left' | 'left-start' | 'left-end'
    | 'right' | 'right-start' | 'right-end'

function toSideAlign(placement: Placement): { side: 'top' | 'bottom' | 'left' | 'right'; align: 'start' | 'center' | 'end' } {
    const dash = placement.indexOf('-')
    const side = (dash === -1 ? placement : placement.slice(0, dash)) as 'top' | 'bottom' | 'left' | 'right'
    const alignPart = dash === -1 ? '' : placement.slice(dash + 1)
    const align = alignPart === 'start' ? 'start' : alignPart === 'end' ? 'end' : 'center'
    return { side, align }
}

const PlacementContext = createContext<Placement>('bottom')

const dropdownItemClassName = [
    'flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm text-secondary outline-none md:min-h-0 md:rounded-sm md:px-2 md:py-1',
    'data-[highlighted]:bg-secondary data-[highlighted]:text-primary',
].join(' ')

// ─── Root ────────────────────────────────────────────────────────────

type DropdownRootProps = {
    children: ReactNode
    closeOnEscape?: boolean
    defaultOpen?: boolean
    onOpenChange?: (nextOpen: boolean) => void
    open?: boolean
    placement?: Placement
}

function DropdownRoot({ children, closeOnEscape = true, defaultOpen, onOpenChange, open, placement = 'bottom' }: DropdownRootProps) {
    const isControlled = open !== undefined
    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen ?? false)
    const isOpen = isControlled ? open : uncontrolledOpen
    function handleOpenChange(nextOpen: boolean, eventDetails: Menu.Root.ChangeEventDetails) {
        if (!closeOnEscape && eventDetails.reason === 'escape-key') return

        if (!isControlled) {
            setUncontrolledOpen(nextOpen)
        }
        onOpenChange?.(nextOpen)
    }

    return (
        <PlacementContext.Provider value={placement}>
            <Menu.Root open={isOpen} onOpenChange={handleOpenChange}>
                {children}
            </Menu.Root>
        </PlacementContext.Provider>
    )
}

// ─── Trigger ─────────────────────────────────────────────────────────
//
// Reuses the supplied interactive element as Base UI's trigger, avoiding
// wrapper elements and nested buttons.

type DropdownTriggerProps = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
    children: ReactElement
}

function DropdownTrigger({ children, className, ...props }: DropdownTriggerProps) {
    const nativeButton = typeof children.type !== 'string' || children.type === 'button'

    return (
        <Menu.Trigger nativeButton={nativeButton} render={children} className={className} {...props} />
    )
}

// ─── Panel ───────────────────────────────────────────────────────────

function DropdownPanel({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    const { side, align } = toSideAlign(useContext(PlacementContext))
    const { state: overlayState } = useOverlayStack()

    return (
        <Menu.Portal container={overlayState.rootElement ?? undefined}>
            <Menu.Positioner side={side} align={align} sideOffset={6} className="z-[9050] outline-none">
                <Menu.Popup
                    className={cn(
                        'pointer-events-auto flex min-w-48 max-w-[calc(100vw-1rem)] flex-col overflow-x-hidden overflow-y-auto rounded-md border border-secondary bg-primary p-1 shadow-lg outline-none',
                        'origin-[var(--transform-origin)] transition-[opacity,transform] duration-150 motion-reduce:transition-none',
                        'data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
                        'data-[ending-style]:scale-95 data-[ending-style]:opacity-0',
                        className,
                    )}
                    {...props}
                >
                    {children}
                </Menu.Popup>
            </Menu.Positioner>
        </Menu.Portal>
    )
}

// ─── Item ────────────────────────────────────────────────────────────

type DropdownItemProps = Omit<ComponentProps<typeof Menu.Item>, 'children' | 'className' | 'onClick'> & {
    children: ReactNode
    className?: string
    onClick?: ComponentProps<typeof Menu.Item>['onClick']
    onSelect?: () => void
}

function DropdownItem({ children, className, onClick, onSelect, ...props }: DropdownItemProps) {
    function handleClick(event: Parameters<NonNullable<ComponentProps<typeof Menu.Item>['onClick']>>[0]) {
        onClick?.(event)
        onSelect?.()
    }

    return (
        <Menu.Item
            className={cn(dropdownItemClassName, className)}
            onClick={handleClick}
            {...props}
        >
            {children}
        </Menu.Item>
    )
}

type DropdownLinkProps = {
    children: ReactNode
    className?: string
    render: ReactElement
}

function DropdownLink({ children, className, render }: DropdownLinkProps) {
    return (
        <Menu.Item nativeButton={false} render={render} className={cn(dropdownItemClassName, className)}>
            {children}
        </Menu.Item>
    )
}

// ─── Separator ───────────────────────────────────────────────────────

function DropdownSeparator({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <Menu.Separator className={cn('my-1 h-px bg-secondary', className)} {...props} />
}

// ─── Compound Export ─────────────────────────────────────────────────

export const Dropdown = Object.assign(DropdownRoot, {
    Trigger: DropdownTrigger,
    Panel: DropdownPanel,
    Item: DropdownItem,
    Link: DropdownLink,
    Separator: DropdownSeparator,
})
