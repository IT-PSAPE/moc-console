import { Menu } from '@base-ui/react/menu'
import { cn } from '@moc/utils/cn'
import { createContext, useContext, type HTMLAttributes, type ReactNode } from 'react'
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
    return (
        <Menu.Root
            open={open}
            defaultOpen={defaultOpen}
            onOpenChange={(nextOpen, eventDetails) => {
                if (!closeOnEscape && eventDetails.reason === 'escape-key') {
                    return
                }
                onOpenChange?.(nextOpen)
            }}
        >
            <PlacementContext.Provider value={placement}>
                <span className="relative inline-flex">{children}</span>
            </PlacementContext.Provider>
        </Menu.Root>
    )
}

// ─── Trigger ─────────────────────────────────────────────────────────
//
// Rendered as a <span> (not Base UI's default <button>) so it can wrap an
// existing <Button>/<Badge> without nesting interactive elements, matching the
// previous `<span role="button">` DOM. `nativeButton={false}` lets Base UI add
// the button role, tabindex and keyboard handling to the span.

function DropdownTrigger({ children, className, ...props }: HTMLAttributes<HTMLSpanElement>) {
    return (
        <Menu.Trigger nativeButton={false} render={<span />} className={className} {...props}>
            {children}
        </Menu.Trigger>
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
                        'origin-[var(--transform-origin)] transition-[opacity,transform] duration-150',
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

type DropdownItemProps = HTMLAttributes<HTMLDivElement> & {
    onSelect?: () => void
}

function DropdownItem({ children, className, onClick, onSelect, ...props }: DropdownItemProps) {
    return (
        <Menu.Item
            className={cn(
                'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-sm text-secondary outline-none',
                'data-[highlighted]:bg-secondary data-[highlighted]:text-primary',
                className,
            )}
            onClick={(event) => {
                onClick?.(event)
                onSelect?.()
            }}
            {...props}
        >
            {children}
        </Menu.Item>
    )
}

// ─── Separator ───────────────────────────────────────────────────────

function DropdownSeparator({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <Menu.Separator className={cn('my-1 h-px bg-secondary', className)} {...props} />
}

// ─── Close ───────────────────────────────────────────────────────────
//
// Base UI menus close automatically when an item is selected, so an explicit
// Close is rarely needed; kept for API compatibility as a passthrough.

function DropdownClose({ children, ...props }: HTMLAttributes<HTMLSpanElement>) {
    return (
        <span role="button" {...props}>
            {children}
        </span>
    )
}

// ─── Compound Export ─────────────────────────────────────────────────

export const Dropdown = Object.assign(DropdownRoot, {
    Trigger: DropdownTrigger,
    Panel: DropdownPanel,
    Item: DropdownItem,
    Separator: DropdownSeparator,
    Close: DropdownClose,
})
