import { Drawer as BaseDrawer } from '@base-ui/react/drawer'
import { cn } from '@moc/utils/cn'
import { createContext, useCallback, useContext, useMemo, useState, type HTMLAttributes, type ReactNode } from 'react'
import { useOverlayStack } from './overlay-provider'
import { OverlayFooter, OverlayHeader } from './overlay-primitives'

// ─── Context ─────────────────────────────────────────────────────────
//
// Backed by Base UI's Drawer (focus-trap, scroll-lock, dismissal and swipe
// gestures), controlled
// via `open`/`onOpenChange`. The context preserves the public `useDrawer()`
// contract { state, actions, meta } that drawer content relies on to close
// itself.

type Side = 'left' | 'right' | 'top' | 'bottom'

const swipeDirectionBySide = {
    bottom: 'down',
    left: 'left',
    right: 'right',
    top: 'up',
} as const

type DrawerContextValue = {
    state: {
        isOpen: boolean
        isTopmost: boolean
        zIndex: number
        side: Side
    }
    actions: {
        close: () => void
        open: () => void
        setOpen: (nextOpen: boolean) => void
    }
    meta: {
        closeOnBackdropClick: boolean
    }
}

const DrawerContext = createContext<DrawerContextValue | null>(null)

export function useDrawer() {
    const context = useContext(DrawerContext)

    if (!context) {
        throw new Error('useDrawer must be used within a Drawer')
    }

    return context
}

// ─── Root ────────────────────────────────────────────────────────────

type DrawerRootProps = {
    children: ReactNode
    closeOnBackdropClick?: boolean
    closeOnEscape?: boolean
    defaultOpen?: boolean
    onOpenChange?: (nextOpen: boolean) => void
    open?: boolean
    side?: Side
}

function DrawerRoot({ children, closeOnBackdropClick = true, closeOnEscape = true, defaultOpen = false, onOpenChange, open, side = 'right' }: DrawerRootProps) {
    const isControlled = open !== undefined
    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
    const isOpen = isControlled ? open : uncontrolledOpen

    const setOpen = useCallback((nextOpen: boolean) => {
        if (!isControlled) {
            setUncontrolledOpen(nextOpen)
        }
        onOpenChange?.(nextOpen)
    }, [isControlled, onOpenChange])

    const value = useMemo<DrawerContextValue>(() => ({
        state: { isOpen, isTopmost: true, zIndex: 9000, side },
        actions: {
            close: () => setOpen(false),
            open: () => setOpen(true),
            setOpen,
        },
        meta: { closeOnBackdropClick },
    }), [closeOnBackdropClick, isOpen, setOpen, side])

    return (
        <DrawerContext.Provider value={value}>
            <BaseDrawer.Root
                open={isOpen}
                disablePointerDismissal={!closeOnBackdropClick}
                swipeDirection={swipeDirectionBySide[side]}
                onOpenChange={(nextOpen, eventDetails) => {
                    if (!nextOpen) {
                        if (!closeOnEscape && eventDetails.reason === 'escape-key') return
                    }
                    setOpen(nextOpen)
                }}
            >
                {children}
            </BaseDrawer.Root>
        </DrawerContext.Provider>
    )
}

// ─── Trigger ─────────────────────────────────────────────────────────

function DrawerTrigger({ children, className, ...props }: HTMLAttributes<HTMLSpanElement>) {
    return (
        <BaseDrawer.Trigger nativeButton={false} render={<span />} className={cn('contents', className)} {...props}>
            {children}
        </BaseDrawer.Trigger>
    )
}

// ─── Close ───────────────────────────────────────────────────────────

function DrawerClose({ children, className, ...props }: HTMLAttributes<HTMLSpanElement>) {
    return (
        <BaseDrawer.Close nativeButton={false} render={<span />} className={className} {...props}>
            {children}
        </BaseDrawer.Close>
    )
}

// ─── Portal ──────────────────────────────────────────────────────────

function DrawerPortal({ children }: { children: ReactNode }) {
    const { state: overlayState } = useOverlayStack()
    return <BaseDrawer.Portal container={overlayState.rootElement ?? undefined}>{children}</BaseDrawer.Portal>
}

// ─── Backdrop ────────────────────────────────────────────────────────

function DrawerBackdrop({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <BaseDrawer.Backdrop
            className={cn(
                'pointer-events-auto fixed inset-0 bg-linear-to-t from-black/30 to-black/3 backdrop-blur-xs',
                'transition-opacity duration-200 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0',
                className,
            )}
            {...props}
        />
    )
}

// ─── Panel ───────────────────────────────────────────────────────────

const panelClassesBySide: Record<Side, string> = {
    left: 'inset-y-0 left-0 w-full max-w-md',
    right: 'inset-y-0 right-0 w-full max-w-md',
    top: 'inset-x-0 top-0 h-auto max-h-[80vh]',
    bottom: 'inset-x-0 bottom-0 h-auto max-h-[80vh]',
}

const slideBySide: Record<Side, string> = {
    left: '[transform:translateX(var(--drawer-swipe-movement-x))] data-[starting-style]:[transform:translateX(-100%)] data-[ending-style]:[transform:translateX(-100%)]',
    right: '[transform:translateX(var(--drawer-swipe-movement-x))] data-[starting-style]:[transform:translateX(100%)] data-[ending-style]:[transform:translateX(100%)]',
    top: '[transform:translateY(var(--drawer-swipe-movement-y))] data-[starting-style]:[transform:translateY(-100%)] data-[ending-style]:[transform:translateY(-100%)]',
    bottom: '[transform:translateY(var(--drawer-swipe-movement-y))] data-[starting-style]:[transform:translateY(100%)] data-[ending-style]:[transform:translateY(100%)]',
}

function DrawerPanel({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    const { state } = useDrawer()

    return (
        <BaseDrawer.Viewport className="pointer-events-none fixed inset-0">
            <BaseDrawer.Popup
                className={cn(
                    'pointer-events-auto fixed w-full transition-transform duration-200 data-[swiping]:duration-0',
                    // See ModalPositioner — same safe-area-aware outer padding so the
                    // drawer never overlaps the status bar or Android gesture indicator
                    // in edge-to-edge PWA mode.
                    'pt-[max(0.5rem,env(safe-area-inset-top))]',
                    'pr-[max(0.5rem,env(safe-area-inset-right))]',
                    'pb-[max(0.5rem,env(safe-area-inset-bottom))]',
                    'pl-[max(0.5rem,env(safe-area-inset-left))]',
                    panelClassesBySide[state.side],
                    slideBySide[state.side],
                    className,
                )}
                {...props}
            >
                <div className="flex h-full flex-col rounded-lg border border-secondary bg-primary">
                    {children}
                </div>
            </BaseDrawer.Popup>
        </BaseDrawer.Viewport>
    )
}

// ─── Header / Content / Footer ───────────────────────────────────────

function DrawerHeader(props: HTMLAttributes<HTMLDivElement>) {
    return <OverlayHeader {...props} />
}

function DrawerContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <BaseDrawer.Content className={cn('min-h-0 flex flex-1 flex-col overflow-y-auto', className)} {...props} />
}

function DrawerFooter(props: HTMLAttributes<HTMLDivElement>) {
    return <OverlayFooter {...props} />
}

// ─── Compound Export ─────────────────────────────────────────────────

export const Drawer = Object.assign(DrawerRoot, {
    Trigger: DrawerTrigger,
    Portal: DrawerPortal,
    Backdrop: DrawerBackdrop,
    Panel: DrawerPanel,
    Header: DrawerHeader,
    Content: DrawerContent,
    Footer: DrawerFooter,
    Close: DrawerClose,
})
