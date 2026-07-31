import { Drawer as BaseDrawer } from '@base-ui/react/drawer'
import { cn } from '@moc/utils/cn'
import { createContext, useCallback, useContext, useMemo, useState, type HTMLAttributes, type ReactElement, type ReactNode } from 'react'
import { useIsMobile } from '../../hooks/use-is-mobile'
import { MobileSheetHandle } from './mobile-sheet'
import { useOverlayRegistration, useOverlayStack } from './overlay-provider'
import { OverlayContent, OverlayFooter, OverlayHeader } from './overlay-primitives'

// ─── Context ─────────────────────────────────────────────────────────
//
// Base UI's Dialog owns focus-trapping, scroll-lock and dismissal. We keep a
// thin context (controlling Base UI via `open`/`onOpenChange`) so the public
// `useModal()` contract — { state, actions, meta } — is preserved.

type ModalContextValue = {
    state: {
        isOpen: boolean
        isTopmost: boolean
        zIndex: number
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

const ModalContext = createContext<ModalContextValue | null>(null)

export function useModal() {
    const context = useContext(ModalContext)

    if (!context) {
        throw new Error('useModal must be used within a Modal')
    }

    return context
}

// ─── Root ────────────────────────────────────────────────────────────

type ModalRootProps = {
    children: ReactNode
    closeOnBackdropClick?: boolean
    closeOnEscape?: boolean
    defaultOpen?: boolean
    onOpenChange?: (nextOpen: boolean) => void
    open?: boolean
}

function ModalRoot({ children, closeOnBackdropClick = true, closeOnEscape = true, defaultOpen = false, onOpenChange, open }: ModalRootProps) {
    const isControlled = open !== undefined
    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
    const isOpen = isControlled ? open : uncontrolledOpen
    const overlayId = useOverlayRegistration(isOpen)

    const setOpen = useCallback((nextOpen: boolean) => {
        if (!isControlled) {
            setUncontrolledOpen(nextOpen)
        }
        onOpenChange?.(nextOpen)
    }, [isControlled, onOpenChange])

    const value = useMemo<ModalContextValue>(() => ({
        state: { isOpen, isTopmost: true, zIndex: 9000 },
        actions: {
            close: () => setOpen(false),
            open: () => setOpen(true),
            setOpen,
        },
        meta: { closeOnBackdropClick, overlayId },
    }), [closeOnBackdropClick, isOpen, overlayId, setOpen])

    function handleOpenChange(nextOpen: boolean, eventDetails: BaseDrawer.Root.ChangeEventDetails) {
        if (!nextOpen) {
            if (!closeOnEscape && eventDetails.reason === 'escape-key') return
            if (!closeOnBackdropClick && eventDetails.reason === 'outside-press') return
        }

        setOpen(nextOpen)
    }

    return (
        <ModalContext.Provider value={value}>
            <BaseDrawer.Root
                open={isOpen}
                disablePointerDismissal={!closeOnBackdropClick}
                swipeDirection="down"
                onOpenChange={handleOpenChange}
            >
                {children}
            </BaseDrawer.Root>
        </ModalContext.Provider>
    )
}

// ─── Trigger ─────────────────────────────────────────────────────────

type ModalControlProps = Omit<HTMLAttributes<HTMLElement>, 'children'> & {
    children: ReactElement
}

function ModalTrigger({ children, className, ...props }: ModalControlProps) {
    const nativeButton = typeof children.type !== 'string' || children.type === 'button'

    return (
        <BaseDrawer.Trigger nativeButton={nativeButton} render={children} className={className} {...props} />
    )
}

// ─── Close ───────────────────────────────────────────────────────────

function ModalClose({ children, className, ...props }: ModalControlProps) {
    return (
        <BaseDrawer.Close render={children} className={className} {...props} />
    )
}

// ─── Portal ──────────────────────────────────────────────────────────

function ModalPortal({ children }: { children: ReactNode }) {
    const { state: overlayState } = useOverlayStack()
    return (
        <BaseDrawer.VirtualKeyboardProvider>
            <BaseDrawer.Portal container={overlayState.rootElement ?? undefined}>{children}</BaseDrawer.Portal>
        </BaseDrawer.VirtualKeyboardProvider>
    )
}

// ─── Backdrop ────────────────────────────────────────────────────────

function ModalBackdrop({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
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

// ─── Positioner ──────────────────────────────────────────────────────

function ModalPositioner({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    const isMobile = useIsMobile()

    return (
        <BaseDrawer.Viewport
            className={cn(
                'pointer-events-none fixed inset-0 flex justify-center',
                isMobile
                    ? 'items-end'
                    : 'items-center pt-[max(0.5rem,env(safe-area-inset-top))] pr-[max(0.5rem,env(safe-area-inset-right))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))]',
                className,
            )}
            {...props}
        >
            {children}
        </BaseDrawer.Viewport>
    )
}

// ─── Panel ───────────────────────────────────────────────────────────

type ModalPanelMode = 'compact' | 'full-screen'

function ModalPanelSurface({ children, className, mode, ...props }: HTMLAttributes<HTMLDivElement> & { mode: ModalPanelMode }) {
    const isMobile = useIsMobile()
    const { meta } = useModal()
    const { state: overlayState } = useOverlayStack()
    const stackIndex = overlayState.stack.indexOf(meta.overlayId)
    const isCovered = stackIndex >= 0 && stackIndex < overlayState.stack.length - 1

    return (
        <BaseDrawer.Popup
            data-base-ui-swipe-ignore={isMobile ? undefined : ''}
            data-overlay-covered={isMobile && isCovered ? '' : undefined}
            className={cn(
                'pointer-events-auto flex w-full flex-col border border-secondary bg-primary outline-none',
                isMobile
                    ? cn(
                        '!max-w-none origin-bottom rounded-t-3xl border-b-0',
                        '[transform:translateY(var(--drawer-swipe-movement-y))] transition-[opacity,transform,border-radius] duration-250 data-[swiping]:duration-0',
                        'data-[starting-style]:translate-y-full data-[starting-style]:opacity-0 data-[ending-style]:translate-y-full data-[ending-style]:opacity-0',
                        'data-[overlay-covered]:!-translate-y-3 data-[overlay-covered]:!scale-[0.96] data-[overlay-covered]:rounded-t-[2rem]',
                        mode === 'full-screen'
                            ? 'h-[calc(100dvh-max(0.5rem,env(safe-area-inset-top)))]'
                            : 'max-h-[90dvh]',
                    )
                    : 'max-h-[calc(100dvh-1rem)] max-w-md origin-center rounded-xl transition-[opacity,transform] duration-200 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0',
                className,
            )}
            {...props}
        >
            {isMobile ? <MobileSheetHandle /> : null}
            {children}
        </BaseDrawer.Popup>
    )
}

function ModalPanel(props: HTMLAttributes<HTMLDivElement>) {
    return <ModalPanelSurface mode="compact" {...props} />
}

function ModalFullScreenPanel(props: HTMLAttributes<HTMLDivElement>) {
    return <ModalPanelSurface mode="full-screen" {...props} />
}

// ─── Header / Content / Footer ───────────────────────────────────────

function ModalHeader(props: HTMLAttributes<HTMLDivElement>) {
    return <OverlayHeader {...props} />
}

function ModalContent(props: HTMLAttributes<HTMLDivElement>) {
    return <OverlayContent {...props} />
}

function ModalFooter(props: HTMLAttributes<HTMLDivElement>) {
    return <OverlayFooter {...props} />
}

// ─── Compound Export ─────────────────────────────────────────────────

export const Modal = Object.assign(ModalRoot, {
    Trigger: ModalTrigger,
    Portal: ModalPortal,
    Backdrop: ModalBackdrop,
    Positioner: ModalPositioner,
    Panel: ModalPanel,
    FullScreenPanel: ModalFullScreenPanel,
    Header: ModalHeader,
    Content: ModalContent,
    Footer: ModalFooter,
    Close: ModalClose,
})
