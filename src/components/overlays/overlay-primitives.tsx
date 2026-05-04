import { cn } from '@/utils/cn'
import { createPortal } from 'react-dom'
import { useEffect, useCallback, useLayoutEffect, useRef, useState, type HTMLAttributes, type MouseEvent, type ReactNode } from 'react'
import { useOverlayStack } from './overlay-provider'

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

// ─── Placement ──────────────────────────────────────────────────────

export type Placement =
    | 'top' | 'top-start' | 'top-end'
    | 'bottom' | 'bottom-start' | 'bottom-end'
    | 'left' | 'left-start' | 'left-end'
    | 'right' | 'right-start' | 'right-end'

type Side = 'top' | 'bottom' | 'left' | 'right'
type Alignment = 'start' | 'center' | 'end'

function parsePlacement(placement: Placement): { side: Side; alignment: Alignment } {
    const parts = placement.split('-')
    return { side: parts[0] as Side, alignment: (parts[1] as Alignment | undefined) ?? 'start' }
}

function buildPlacement(side: Side, alignment: Alignment): Placement {
    return (alignment === 'start' ? side : `${side}-${alignment}`) as Placement
}

function getOppositeSide(side: Side): Side {
    const opposites: Record<Side, Side> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }
    return opposites[side]
}

function getOppositeAlignment(alignment: Alignment): Alignment {
    const opposites: Record<Alignment, Alignment> = { start: 'end', end: 'start', center: 'center' }
    return opposites[alignment]
}

// ─── Anchor Position ────────────────────────────────────────────────

type AnchorPosition = {
    isPositioned: boolean
    top: number
    left: number
    maxHeight: number
    maxWidth: number
    placement: Placement
}

const VIEWPORT_PADDING = 8

function clamp(value: number, minimum: number, maximum: number) {
    if (maximum <= minimum) {
        return minimum
    }

    return Math.min(Math.max(value, minimum), maximum)
}

export function useAnchorPosition(
    triggerElement: HTMLElement | null,
    panelElement: HTMLElement | null,
    isOpen: boolean,
    preferredPlacement: Placement = 'bottom',
    offset: number = 4,
): AnchorPosition {
    const frameRef = useRef<number | null>(null)
    const [position, setPosition] = useState<AnchorPosition>({
        isPositioned: false,
        top: 0,
        left: 0,
        maxHeight: 0,
        maxWidth: 0,
        placement: preferredPlacement,
    })

    const calculate = useCallback(() => {
        if (!triggerElement || !panelElement) {
            return
        }

        const triggerRect = triggerElement.getBoundingClientRect()
        const panelRect = panelElement.getBoundingClientRect()
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight
        const vp = {
            top: VIEWPORT_PADDING,
            right: viewportWidth - VIEWPORT_PADDING,
            bottom: viewportHeight - VIEWPORT_PADDING,
            left: VIEWPORT_PADDING,
            width: Math.max(viewportWidth - VIEWPORT_PADDING * 2, 0),
            height: Math.max(viewportHeight - VIEWPORT_PADDING * 2, 0),
        }

        const naturalWidth = Math.min(Math.max(panelRect.width, panelElement.scrollWidth), vp.width)
        const naturalHeight = Math.min(Math.max(panelRect.height, panelElement.scrollHeight), vp.height)

        const { side: preferredSide, alignment: preferredAlignment } = parsePlacement(preferredPlacement)
        const isVertical = preferredSide === 'top' || preferredSide === 'bottom'

        const space = {
            top: Math.max(triggerRect.top - vp.top - offset, 0),
            bottom: Math.max(vp.bottom - triggerRect.bottom - offset, 0),
            left: Math.max(triggerRect.left - vp.left - offset, 0),
            right: Math.max(vp.right - triggerRect.right - offset, 0),
        }

        // ── Step 1: Resolve main axis — flip side if content overflows ──

        let side = preferredSide
        const mainSize = isVertical ? naturalHeight : naturalWidth

        if (mainSize > space[preferredSide] && space[getOppositeSide(preferredSide)] > space[preferredSide]) {
            side = getOppositeSide(preferredSide)
        }

        // ── Step 2: Calculate constraints for the resolved side ──

        let maxHeight: number
        let maxWidth: number

        if (isVertical) {
            maxHeight = space[side]
            maxWidth = vp.width
        } else {
            maxHeight = vp.height
            maxWidth = space[side]
        }

        const renderedWidth = Math.min(naturalWidth, maxWidth)
        const renderedHeight = Math.min(naturalHeight, maxHeight)

        // ── Step 3: Calculate position for preferred alignment ──

        let top: number
        let left: number

        if (isVertical) {
            top = side === 'bottom'
                ? triggerRect.bottom + offset
                : triggerRect.top - renderedHeight - offset

            if (preferredAlignment === 'end') {
                left = triggerRect.right - renderedWidth
            } else if (preferredAlignment === 'center') {
                left = triggerRect.left + (triggerRect.width - renderedWidth) / 2
            } else {
                left = triggerRect.left
            }
        } else {
            left = side === 'right'
                ? triggerRect.right + offset
                : triggerRect.left - renderedWidth - offset

            if (preferredAlignment === 'end') {
                top = triggerRect.bottom - renderedHeight
            } else if (preferredAlignment === 'center') {
                top = triggerRect.top + (triggerRect.height - renderedHeight) / 2
            } else {
                top = triggerRect.top
            }
        }

        // ── Step 4: Resolve cross-axis — flip alignment if overflowing ──

        let alignment = preferredAlignment

        if (isVertical) {
            if (left + renderedWidth > vp.right && alignment !== 'end') {
                alignment = getOppositeAlignment(alignment)
                left = alignment === 'end'
                    ? triggerRect.right - renderedWidth
                    : triggerRect.left
            } else if (left < vp.left && alignment !== 'start') {
                alignment = getOppositeAlignment(alignment)
                left = alignment === 'start'
                    ? triggerRect.left
                    : triggerRect.right - renderedWidth
            }
        } else {
            if (top + renderedHeight > vp.bottom && alignment !== 'end') {
                alignment = getOppositeAlignment(alignment)
                top = alignment === 'end'
                    ? triggerRect.bottom - renderedHeight
                    : triggerRect.top
            } else if (top < vp.top && alignment !== 'start') {
                alignment = getOppositeAlignment(alignment)
                top = alignment === 'start'
                    ? triggerRect.top
                    : triggerRect.bottom - renderedHeight
            }
        }

        // ── Step 5: Final viewport clamp ──

        top = clamp(top, vp.top, vp.bottom - renderedHeight)
        left = clamp(left, vp.left, vp.right - renderedWidth)

        const nextPosition: AnchorPosition = {
            isPositioned: true,
            top,
            left,
            maxHeight: Math.max(maxHeight, 0),
            maxWidth: Math.max(maxWidth, 0),
            placement: buildPlacement(side, alignment),
        }

        setPosition((previousPosition) => {
            if (
                previousPosition.isPositioned === nextPosition.isPositioned
                && previousPosition.top === nextPosition.top
                && previousPosition.left === nextPosition.left
                && previousPosition.maxHeight === nextPosition.maxHeight
                && previousPosition.maxWidth === nextPosition.maxWidth
                && previousPosition.placement === nextPosition.placement
            ) {
                return previousPosition
            }

            return nextPosition
        })
    }, [offset, panelElement, preferredPlacement, triggerElement])

    const scheduleCalculate = useCallback(() => {
        if (frameRef.current !== null) {
            window.cancelAnimationFrame(frameRef.current)
        }

        frameRef.current = window.requestAnimationFrame(() => {
            frameRef.current = null
            calculate()
        })
    }, [calculate])

    useLayoutEffect(() => {
        if (!isOpen) {
            return
        }

        // Synchronous initial calculation to prevent positioning flash
        // eslint-disable-next-line react-hooks/set-state-in-effect
        calculate()

        const resizeObserver = typeof ResizeObserver === 'undefined'
            ? null
            : new ResizeObserver(() => {
                // Immediate recalculation for content size changes (e.g. async data loading)
                calculate()
            })

        if (triggerElement) {
            resizeObserver?.observe(triggerElement)
        }

        if (panelElement) {
            resizeObserver?.observe(panelElement)
        }

        // Scroll and window resize use rAF debounce since they fire rapidly
        window.addEventListener('resize', scheduleCalculate)
        window.addEventListener('scroll', scheduleCalculate, true)

        return () => {
            resizeObserver?.disconnect()

            if (frameRef.current !== null) {
                window.cancelAnimationFrame(frameRef.current)
                frameRef.current = null
            }

            window.removeEventListener('resize', scheduleCalculate)
            window.removeEventListener('scroll', scheduleCalculate, true)
        }
    }, [calculate, isOpen, panelElement, scheduleCalculate, triggerElement])

    return position
}

export function useClickOutside(elements: Array<HTMLElement | null>, isActive: boolean, handler: () => void) {
    const handlerRef = useRef(handler)

    useEffect(() => {
        handlerRef.current = handler
    }, [handler])

    useEffect(() => {
        if (!isActive) {
            return
        }

        function handlePointerDown(event: PointerEvent) {
            const target = event.target as Node

            const isOutside = elements.every((element) => {
                return !element || !element.contains(target)
            })

            if (isOutside) {
                handlerRef.current()
            }
        }

        document.addEventListener('pointerdown', handlePointerDown)

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown)
        }
    }, [elements, isActive])
}
