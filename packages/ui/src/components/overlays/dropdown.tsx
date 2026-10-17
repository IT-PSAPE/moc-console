import { Menu } from '@base-ui/react/menu'
import { cn } from '@moc/utils/cn'
import { createContext, useContext, useRef, useState, type ComponentProps, type HTMLAttributes, type ReactElement, type ReactNode } from 'react'
import { useIsLandscape } from '../../hooks/use-is-landscape'
import { Drawer } from './drawer'
import { mobileSheetPositionerClassName } from './mobile-sheet'
import { useOverlayStack } from './overlay-provider'
import { Check } from 'lucide-react'
import { Paragraph } from '../display/text'

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

type DropdownContextValue = {
    isLandscape: boolean
    isNested: boolean
    placement: Placement
}

const DropdownContext = createContext<DropdownContextValue>({ isLandscape: false, isNested: false, placement: 'bottom' })

const dropdownItemClassName = [
    'flex h-control cursor-pointer items-center gap-2 rounded-md px-2.5 label-sm font-medium text-secondary outline-none landscape:h-control-lg',
    'data-[highlighted]:bg-secondary data-[highlighted]:text-primary',
    'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
].join(' ')

// ─── Root ────────────────────────────────────────────────────────────

type DropdownRootProps = {
    children: ReactNode
    closeOnEscape?: boolean
    defaultOpen?: boolean
    onOpenChange?: (nextOpen: boolean) => void
    open?: boolean
    placement?: Placement
    modal?: boolean
}

function DropdownRoot({ children, closeOnEscape = true, defaultOpen, onOpenChange, open, placement = 'bottom', modal }: DropdownRootProps) {
    const isLandscape = useIsLandscape()
    const parentDropdown = useContext(DropdownContext)
    const isNested = parentDropdown.isNested
    const isControlled = open !== undefined
    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen ?? false)
    const triggerRef = useRef<HTMLElement | null>(null)
    const isOpen = isControlled ? open : uncontrolledOpen
    function handleOpenChange(nextOpen: boolean, eventDetails: Menu.Root.ChangeEventDetails) {
        if (!closeOnEscape && eventDetails.reason === 'escape-key') return
        if (nextOpen) triggerRef.current = eventDetails.trigger instanceof HTMLElement ? eventDetails.trigger : null

        if (!isControlled) {
            setUncontrolledOpen(nextOpen)
        }
        onOpenChange?.(nextOpen)
    }

    function handleDrawerOpenChange(nextOpen: boolean) {
        if (nextOpen === isOpen) return
        if (!isControlled) {
            setUncontrolledOpen(nextOpen)
        }
        onOpenChange?.(nextOpen)
    }

    const dropdown = (
        <DropdownContext.Provider value={{ isLandscape, isNested, placement }}>
            <Menu.Root modal={isNested ? undefined : modal ?? !isLandscape} open={isOpen} onOpenChange={handleOpenChange}>
                {children}
            </Menu.Root>
        </DropdownContext.Provider>
    )

    if (isNested || !isLandscape) return dropdown

    return <Drawer mobileSide="bottom" open={isOpen} onOpenChange={handleDrawerOpenChange} triggerRef={triggerRef}>{dropdown}</Drawer>
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
    const { isLandscape, isNested, placement } = useContext(DropdownContext)
    const { side, align } = toSideAlign(placement)
    const { state: overlayState } = useOverlayStack()

    if (isLandscape && !isNested) {
        return (
            <Drawer.Portal>
                <Drawer.Backdrop />
                <Menu.Portal container={overlayState.rootElement ?? undefined}>
                    <Menu.Positioner className={mobileSheetPositionerClassName}>
                        <Drawer.Panel>
                            <Drawer.Content className="gap-0 overflow-hidden p-0">
                                <Menu.Popup className={cn('min-h-0 flex-1 overflow-y-auto p-1 outline-none', className)} {...props}>
                                    {children}
                                </Menu.Popup>
                            </Drawer.Content>
                        </Drawer.Panel>
                    </Menu.Positioner>
                </Menu.Portal>
            </Drawer.Portal>
        )
    }

    return (
        <Menu.Portal container={overlayState.rootElement ?? undefined}>
            <Menu.Positioner side={side} align={align} sideOffset={6} className="z-[9050] outline-none">
                <Menu.Popup
                    className={cn(
                        'pointer-events-auto flex min-w-48 max-w-[calc(100vw-1rem)] flex-col overflow-x-hidden overflow-y-auto rounded-lg border border-secondary bg-primary p-1 shadow-lg outline-none',
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
    return <Menu.Separator className={cn('my-1 -mx-1 h-px bg-border-secondary', className)} {...props} />
}

function DropdownSubmenu({ children }: { children: ReactNode }) {
    const context = useContext(DropdownContext)
    return <DropdownContext.Provider value={{ ...context, isNested: true }}><Menu.SubmenuRoot>{children}</Menu.SubmenuRoot></DropdownContext.Provider>
}

type DropdownSubmenuTriggerProps = Omit<ComponentProps<typeof Menu.SubmenuTrigger>, 'children' | 'render' | 'className'> & { children: ReactElement; className?: string }

function DropdownSubmenuTrigger({ children, className, ...props }: DropdownSubmenuTriggerProps) {
    const { isLandscape } = useContext(DropdownContext)
    return <Menu.SubmenuTrigger render={children} openOnHover={!isLandscape} delay={100} closeDelay={180} className={cn(dropdownItemClassName, className)} {...props} />
}

function DropdownSubmenuPanel({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    const { isLandscape } = useContext(DropdownContext)
    const { state: overlayState } = useOverlayStack()
    return <Menu.Portal container={overlayState.rootElement ?? undefined}>
        <Menu.Positioner side={isLandscape ? 'bottom' : 'right'} align="start" sideOffset={4} className="z-[9055] outline-none">
            <Menu.Popup className={cn('pointer-events-auto flex max-h-[min(70dvh,32rem)] min-w-56 max-w-[calc(100vw-1rem)] flex-col overflow-y-auto rounded-lg border border-secondary bg-primary p-1 shadow-lg outline-none', className)} {...props}>{children}</Menu.Popup>
        </Menu.Positioner>
    </Menu.Portal>
}

type DropdownCheckboxOption = { value: string; label: string }
type DropdownCheckboxListProps = { label: string; options: DropdownCheckboxOption[]; selected: string[]; name: string; onValueChange: (name: string, value: string) => void }

function DropdownCheckboxList({ label, options, selected, name, onValueChange }: DropdownCheckboxListProps) {
    function renderOption(option: DropdownCheckboxOption) {
        function handleCheckedChange() { onValueChange(name, option.value) }
        return <Menu.CheckboxItem key={option.value} checked={selected.includes(option.value)} closeOnClick={false} onCheckedChange={handleCheckedChange} className={cn(dropdownItemClassName, 'group')}>
            <span aria-hidden="true" className="flex size-4 shrink-0 items-center justify-center rounded border border-primary bg-primary shadow-xs group-data-[checked]:border-brand_solid group-data-[checked]:bg-brand_solid group-data-[checked]:text-on-brand">
                <Menu.CheckboxItemIndicator keepMounted className="opacity-0 group-data-[checked]:opacity-100"><Check className="size-3" /></Menu.CheckboxItemIndicator>
            </span>
            <span className="min-w-0 flex-1 truncate">{option.label}</span>
        </Menu.CheckboxItem>
    }
    return <div role="group" aria-label={label} className="max-h-52 overflow-y-auto">{options.length ? options.map(renderOption) : <Paragraph.sm className="px-2.5 py-2 text-tertiary">No options available.</Paragraph.sm>}</div>
}

// ─── Compound Export ─────────────────────────────────────────────────

export const Dropdown = Object.assign(DropdownRoot, {
    Trigger: DropdownTrigger,
    Panel: DropdownPanel,
    Item: DropdownItem,
    Link: DropdownLink,
    Separator: DropdownSeparator,
    Submenu: DropdownSubmenu,
    SubmenuTrigger: DropdownSubmenuTrigger,
    SubmenuPanel: DropdownSubmenuPanel,
    CheckboxList: DropdownCheckboxList,
})
