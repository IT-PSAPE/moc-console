import { cn } from '@moc/utils/cn'
import { useRef, type HTMLAttributes, type KeyboardEvent, type PointerEvent } from 'react'

type ResizeHandleProps = Omit<HTMLAttributes<HTMLDivElement>, 'onReset'> & {
    'aria-label': string
    /** Current value for assistive tech, 0–100. */
    value: number
    minimum?: number
    maximum?: number
    valueText?: string
    isResizing?: boolean
    onResizingChange?: (resizing: boolean) => void
    /** Pointer position along the axis; the owner maps it onto its own width model. */
    onResizeAt: (clientX: number) => void
    /** Keyboard step; `shift` passes a coarser step. */
    onResizeBy: (amount: number) => void
    onResizeToBoundary?: (boundary: 'minimum' | 'maximum') => void
    onReset?: () => void
}

/**
 * A hairline vertical divider that doubles as a drag handle. The visible line
 * is always 1px (`border-secondary`, brand on hover/focus/drag); a 12px
 * invisible strip around it is the pointer target. Used between the sidebar and
 * the content, and between a list and its detail panel, so both read as the
 * same divider (docs/design-system.md §4).
 */
export function ResizeHandle({ className, isResizing = false, maximum = 100, minimum = 0, onReset, onResizeAt, onResizeBy, onResizeToBoundary, onResizingChange, value, valueText, ...props }: ResizeHandleProps) {
    const draggingRef = useRef(false)

    function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
        draggingRef.current = true
        event.currentTarget.setPointerCapture(event.pointerId)
        onResizingChange?.(true)
        onResizeAt(event.clientX)
    }

    function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
        if (!draggingRef.current) return
        onResizeAt(event.clientX)
    }

    function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
        if (!draggingRef.current) return
        draggingRef.current = false
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
        onResizingChange?.(false)
    }

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        const amount = event.shiftKey ? 0.1 : 0.02
        if (event.key === 'ArrowLeft') onResizeBy(-amount)
        else if (event.key === 'ArrowRight') onResizeBy(amount)
        else if (event.key === 'Home' && onResizeToBoundary) onResizeToBoundary('minimum')
        else if (event.key === 'End' && onResizeToBoundary) onResizeToBoundary('maximum')
        else return
        event.preventDefault()
    }

    return (
        <div
            {...props}
            aria-orientation="vertical"
            aria-valuemax={Math.round(maximum)}
            aria-valuemin={Math.round(minimum)}
            aria-valuenow={Math.round(value)}
            aria-valuetext={valueText}
            className={cn(
                'relative z-10 block w-px shrink-0 cursor-col-resize touch-none bg-border-secondary outline-none transition-colors',
                // Invisible 12px pointer target centred on the hairline.
                'before:absolute before:inset-y-0 before:left-1/2 before:w-3 before:-translate-x-1/2',
                'hover:bg-border-brand focus-visible:bg-border-brand',
                isResizing && 'bg-border-brand',
                className,
            )}
            onDoubleClick={onReset}
            onKeyDown={handleKeyDown}
            onPointerCancel={handlePointerEnd}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            role="separator"
            tabIndex={0}
        />
    )
}
