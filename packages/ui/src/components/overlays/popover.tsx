import { Popover as BasePopover } from '@base-ui/react/popover'
import { cn } from '@moc/utils/cn'
import { createContext, useContext, type HTMLAttributes, type ReactNode } from 'react'
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

// ─── Root ────────────────────────────────────────────────────────────

type PopoverRootProps = {
    children: ReactNode
    closeOnEscape?: boolean
    defaultOpen?: boolean
    onOpenChange?: (nextOpen: boolean) => void
    open?: boolean
    placement?: Placement
}

function PopoverRoot({ children, closeOnEscape = true, defaultOpen, onOpenChange, open, placement = 'bottom' }: PopoverRootProps) {
    return (
        <BasePopover.Root
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
        </BasePopover.Root>
    )
}

// ─── Trigger ─────────────────────────────────────────────────────────

function PopoverTrigger({ children, className, ...props }: HTMLAttributes<HTMLSpanElement>) {
    return (
        <BasePopover.Trigger nativeButton={false} render={<span />} className={className} {...props}>
            {children}
        </BasePopover.Trigger>
    )
}

// ─── Panel ───────────────────────────────────────────────────────────

function PopoverPanel({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    const { side, align } = toSideAlign(useContext(PlacementContext))
    const { state: overlayState } = useOverlayStack()

    return (
        <BasePopover.Portal container={overlayState.rootElement ?? undefined}>
            <BasePopover.Positioner side={side} align={align} sideOffset={6} className="z-[9050] outline-none">
                <BasePopover.Popup
                    className={cn(
                        'pointer-events-auto flex min-w-48 max-w-[calc(100vw-1rem)] flex-col overflow-x-hidden overflow-y-auto rounded-xl border border-secondary bg-primary shadow-lg outline-none',
                        'origin-[var(--transform-origin)] transition-[opacity,transform] duration-150',
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

function PopoverClose({ children, className, ...props }: HTMLAttributes<HTMLSpanElement>) {
    return (
        <BasePopover.Close nativeButton={false} render={<span />} className={className} {...props}>
            {children}
        </BasePopover.Close>
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
