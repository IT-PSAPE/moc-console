import { cn } from '@moc/utils/cn'
import { createPortal } from 'react-dom'
import { type HTMLAttributes, type MouseEvent, type ReactNode } from 'react'
import { useOverlayStack } from './overlay-provider'

// Positioning math and click-outside detection live in dedicated modules to
// keep this file within the component size limit. Re-exported here so existing
// consumers can keep importing from './overlay-primitives'.
export { useAnchorPosition, type Placement } from './overlay-positioning'
export { useClickOutside } from './use-click-outside'

// ─── Portal ──────────────────────────────────────────────────────────

type OverlayPortalProps = {
    children: ReactNode
    isOpen: boolean
    zIndex: number
}

export function OverlayPortal({ children, isOpen, zIndex }: OverlayPortalProps) {
    const { state: overlayState } = useOverlayStack()

    if (!isOpen || !overlayState.rootElement) {
        return null
    }

    return createPortal(
        <div className="pointer-events-none fixed inset-0" style={{ zIndex }}>
            {children}
        </div>,
        overlayState.rootElement,
    )
}

// ─── Backdrop ────────────────────────────────────────────────────────

type OverlayBackdropProps = HTMLAttributes<HTMLDivElement> & {
    closeOnClick?: boolean
    onClose: () => void
}

export function OverlayBackdrop({ className, closeOnClick = true, onClick, onClose, ...props }: OverlayBackdropProps) {
    function handleClick(event: MouseEvent<HTMLDivElement>) {
        onClick?.(event)

        if (event.defaultPrevented || !closeOnClick) {
            return
        }

        onClose()
    }

    return (
        <div
            aria-hidden="true"
            className={cn('pointer-events-auto fixed inset-0 bg-linear-to-t from-black/30 to-black/3 backdrop-blur-xs', className)}
            onClick={handleClick}
            {...props}
        />
    )
}

// ─── Trigger ─────────────────────────────────────────────────────────

type OverlayTriggerProps = HTMLAttributes<HTMLSpanElement> & {
    onOpen: () => void
}

export function OverlayTrigger({ children, onClick, onOpen, ...props }: OverlayTriggerProps) {
    function handleClick(event: MouseEvent<HTMLSpanElement>) {
        onClick?.(event)

        if (event.defaultPrevented) {
            return
        }

        onOpen()
    }

    return (
        <span onClick={handleClick} {...props} className={cn('contents', props.className)} role="button">
            {children}
        </span>
    )
}

// ─── Close ───────────────────────────────────────────────────────────

type OverlayCloseProps = HTMLAttributes<HTMLSpanElement> & {
    onClose: () => void
}

export function OverlayClose({ children, onClick, onClose, ...props }: OverlayCloseProps) {
    function handleClick(event: MouseEvent<HTMLSpanElement>) {
        onClick?.(event)

        if (event.defaultPrevented) {
            return
        }

        onClose()
    }

    return (
        <span onClick={handleClick} {...props} role="button">
            {children}
        </span>
    )
}

// ─── Header ──────────────────────────────────────────────────────────

type OverlayHeaderProps = HTMLAttributes<HTMLDivElement>

export function OverlayHeader({ children, className, ...props }: OverlayHeaderProps) {
    return (
        <div className={cn('flex items-center gap-2 border-b border-secondary p-3', className)} {...props}>
            {children}
        </div>
    )
}

// ─── Content ─────────────────────────────────────────────────────────

type OverlayContentProps = HTMLAttributes<HTMLDivElement>

export function OverlayContent({ children, className, ...props }: OverlayContentProps) {
    return (
        <div className={cn('min-h-0 flex flex-1 flex-col overflow-y-auto', className)} {...props}>
            {children}
        </div>
    )
}

// ─── Footer ──────────────────────────────────────────────────────────

type OverlayFooterProps = HTMLAttributes<HTMLDivElement>

export function OverlayFooter({ children, className, ...props }: OverlayFooterProps) {
    return (
        <div className={cn('flex items-center gap-2 border-t border-secondary p-3', className)} {...props}>
            {children}
        </div>
    )
}
