import { Popover as BasePopover } from '@base-ui/react/popover'
import { cn } from '@moc/utils/cn'
import { createContext, useContext, useState, type HTMLAttributes, type ReactElement, type ReactNode } from 'react'
import { useOverlayStack } from './overlay-provider'

// ─── Placement ───────────────────────────────────────────────────────

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

export type PopoverChangeEventDetails = BasePopover.Root.ChangeEventDetails

// ─── Root ────────────────────────────────────────────────────────────

type PopoverRootProps = {
    children: ReactNode
    closeOnEscape?: boolean
    defaultOpen?: boolean
    onOpenChange?: (nextOpen: boolean, eventDetails: PopoverChangeEventDetails) => void
    open?: boolean
    placement?: Placement
    triggerId?: string | null
}

function PopoverRoot({ children, closeOnEscape = true, defaultOpen, onOpenChange, open, placement = 'bottom', triggerId }: PopoverRootProps) {
    const isControlled = open !== undefined
    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen ?? false)
    const isOpen = isControlled ? open : uncontrolledOpen
    function handleOpenChange(nextOpen: boolean, eventDetails: BasePopover.Root.ChangeEventDetails) {
        if (!closeOnEscape && eventDetails.reason === 'escape-key') {
            return
        }

        if (!isControlled) {
            setUncontrolledOpen(nextOpen)
        }
        onOpenChange?.(nextOpen, eventDetails)
    }

    return (
        <PlacementContext.Provider value={placement}>
            <BasePopover.Root open={isOpen} onOpenChange={handleOpenChange} triggerId={triggerId}>
                {children}
            </BasePopover.Root>
        </PlacementContext.Provider>
    )
}

// ─── Trigger ─────────────────────────────────────────────────────────

type PopoverControlProps = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
    children: ReactElement
}

type PopoverTriggerProps = PopoverControlProps & Pick<BasePopover.Trigger.Props, 'openOnHover' | 'delay' | 'closeDelay'>

function PopoverTrigger({ children, className, ...props }: PopoverTriggerProps) {
    const nativeButton = typeof children.type !== 'string' || children.type === 'button'

    return (
        <BasePopover.Trigger nativeButton={nativeButton} render={children} className={className} {...props} />
    )
}

// ─── Panel ───────────────────────────────────────────────────────────

type PopoverPanelProps = HTMLAttributes<HTMLDivElement> & Pick<BasePopover.Positioner.Props, 'anchor' | 'sideOffset' | 'alignOffset' | 'collisionPadding'>

function PopoverPanel({ children, className, anchor, sideOffset = 6, alignOffset, collisionPadding, ...props }: PopoverPanelProps) {
    const { side, align } = toSideAlign(useContext(PlacementContext))
    const { state: overlayState } = useOverlayStack()

    return (
        <BasePopover.Portal container={overlayState.rootElement ?? undefined}>
            <BasePopover.Positioner anchor={anchor} side={side} align={align} sideOffset={sideOffset} alignOffset={alignOffset} collisionPadding={collisionPadding} className="z-[9050] outline-none">
                <BasePopover.Popup
                    className={cn(
                        'pointer-events-auto flex min-w-48 max-w-[calc(100vw-1rem)] flex-col overflow-x-hidden overflow-y-auto rounded-lg border border-secondary bg-primary shadow-lg outline-none',
                        'origin-[var(--transform-origin)] transition-[opacity,transform] duration-150 motion-reduce:transition-none',
                        'data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
                        'data-[ending-style]:scale-95 data-[ending-style]:opacity-0',
                        className,
                    )}
                    {...props}
                >
                    {children}
                </BasePopover.Popup>
            </BasePopover.Positioner>
        </BasePopover.Portal>
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
        <div className={cn('flex min-h-0 flex-1 flex-col overflow-y-auto p-3', className)} {...props}>
            {children}
        </div>
    )
}

// ─── Close ───────────────────────────────────────────────────────────

function PopoverClose({ children, className, ...props }: PopoverControlProps) {
    const nativeButton = typeof children.type !== 'string' || children.type === 'button'

    return (
        <BasePopover.Close nativeButton={nativeButton} render={children} className={className} {...props} />
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
