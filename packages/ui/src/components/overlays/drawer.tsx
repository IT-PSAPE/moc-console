import { Drawer as BaseDrawer } from '@base-ui/react/drawer'
import { cn } from '@moc/utils/cn'
import { createContext, useCallback, useContext, useMemo, useState, type HTMLAttributes, type ReactElement, type ReactNode } from 'react'
import { useIsMobile } from '../../hooks/use-is-mobile'
import { MobileSheetHandle } from './mobile-sheet'
import { useOverlayRegistration, useOverlayStack } from './overlay-provider'
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
        overlayId: string
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
    const isMobile = useIsMobile()
    const isControlled = open !== undefined
    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
    const isOpen = isControlled ? open : uncontrolledOpen
    const effectiveSide = isMobile ? 'bottom' : side
    const overlayId = useOverlayRegistration(isOpen)

    const setOpen = useCallback((nextOpen: boolean) => {
        if (!isControlled) {
            setUncontrolledOpen(nextOpen)
        }
        onOpenChange?.(nextOpen)
    }, [isControlled, onOpenChange])

    const value = useMemo<DrawerContextValue>(() => ({
        state: { isOpen, isTopmost: true, zIndex: 9000, side: effectiveSide },
        actions: {
            close: () => setOpen(false),
            open: () => setOpen(true),
            setOpen,
        },
        meta: { closeOnBackdropClick, overlayId },
    }), [closeOnBackdropClick, effectiveSide, isOpen, overlayId, setOpen])

    function handleOpenChange(nextOpen: boolean, eventDetails: BaseDrawer.Root.ChangeEventDetails) {
        if (!nextOpen && !closeOnEscape && eventDetails.reason === 'escape-key') {
            return
        }

        setOpen(nextOpen)
    }

    return (
        <DrawerContext.Provider value={value}>
            <BaseDrawer.Root
                open={isOpen}
                disablePointerDismissal={!closeOnBackdropClick}
                swipeDirection={swipeDirectionBySide[effectiveSide]}
                onOpenChange={handleOpenChange}
            >
                {children}
            </BaseDrawer.Root>
        </DrawerContext.Provider>
    )
}

// ─── Trigger ─────────────────────────────────────────────────────────

type DrawerControlProps = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
    children: ReactElement
}

function DrawerTrigger({ children, className, ...props }: DrawerControlProps) {
    const nativeButton = typeof children.type !== 'string' || children.type === 'button'

    return (
        <BaseDrawer.Trigger nativeButton={nativeButton} render={children} className={className} {...props} />
    )
}

// ─── Close ───────────────────────────────────────────────────────────

function DrawerClose({ children, className, ...props }: DrawerControlProps) {
    return (
        <BaseDrawer.Close render={children} className={className} {...props} />
    )
}

// ─── Portal ──────────────────────────────────────────────────────────

function DrawerPortal({ children }: { children: ReactNode }) {
    const { state: overlayState } = useOverlayStack()
    return (
        <BaseDrawer.VirtualKeyboardProvider>
            <BaseDrawer.Portal container={overlayState.rootElement ?? undefined}>{children}</BaseDrawer.Portal>
        </BaseDrawer.VirtualKeyboardProvider>
    )
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
    bottom: 'inset-x-0 bottom-0 h-[calc(100dvh-max(0.5rem,env(safe-area-inset-top)))] max-h-[94dvh] md:h-auto md:max-h-[80vh]',
}

const slideBySide: Record<Side, string> = {
    left: '[transform:translateX(var(--drawer-swipe-movement-x))] data-[starting-style]:[transform:translateX(-100%)] data-[ending-style]:[transform:translateX(-100%)]',
    right: '[transform:translateX(var(--drawer-swipe-movement-x))] data-[starting-style]:[transform:translateX(100%)] data-[ending-style]:[transform:translateX(100%)]',
    top: '[transform:translateY(var(--drawer-swipe-movement-y))] data-[starting-style]:[transform:translateY(-100%)] data-[ending-style]:[transform:translateY(-100%)]',
    bottom: '[transform:translateY(var(--drawer-swipe-movement-y))] data-[starting-style]:[transform:translateY(100%)] data-[ending-style]:[transform:translateY(100%)]',
}

function DrawerPanel({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    const isMobile = useIsMobile()
    const { state, meta } = useDrawer()
    const { state: overlayState } = useOverlayStack()
    const stackIndex = overlayState.stack.indexOf(meta.overlayId)
    const isCovered = stackIndex >= 0 && stackIndex < overlayState.stack.length - 1

    return (
        <BaseDrawer.Viewport className="pointer-events-none fixed inset-0">
            <BaseDrawer.Popup
                className={cn(
                    'pointer-events-auto fixed w-full outline-none transition-transform duration-200 data-[swiping]:duration-0',
                    isMobile && '!max-w-none',
                    !isMobile && 'pt-[max(0.5rem,env(safe-area-inset-top))] pr-[max(0.5rem,env(safe-area-inset-right))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))]',
                    panelClassesBySide[state.side],
                    slideBySide[state.side],
                    className,
                )}
                {...props}
            >
                <div
                    data-overlay-covered={isMobile && isCovered ? '' : undefined}
                    className={cn(
                        'flex h-full flex-col border border-secondary bg-primary transition-[transform,border-radius] duration-250',
                        isMobile
                            ? 'origin-top rounded-t-3xl border-b-0 data-[overlay-covered]:-translate-y-3 data-[overlay-covered]:scale-[0.96] data-[overlay-covered]:rounded-t-[2rem]'
                            : 'rounded-lg',
                    )}
                >
                    {isMobile ? <MobileSheetHandle /> : null}
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
    return <BaseDrawer.Content className={cn('min-h-0 flex flex-1 flex-col overflow-y-auto overscroll-contain max-md:pb-[max(1rem,env(safe-area-inset-bottom))]', className)} {...props} />
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
