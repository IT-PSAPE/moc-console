import { useCallback, useRef, type ReactNode } from 'react'
import { cn } from '@moc/utils/cn'
import { LaneProvider, useTimeline } from './context'
import { LANE_HEIGHT, TIMELINE_HORIZONTAL_PADDING, buildTimeMarkers, getMarkerInterval } from './types'

type LaneProps = {
    id: string
    /**
     * Optional click-to-place callback. Provided → clicking empty lane space
     * fires with the time at the pointer. Omitted → the lane is not clickable
     * (read-only is just a smaller tree — see ADR-0003). Not a boolean toggle.
     */
    onClickAt?: (start: number) => void
    children?: ReactNode
    className?: string
}

export function TimelineLane({ id, onClickAt, children, className }: LaneProps) {
    const { lanes, total, effectiveZoom, pixelsPerUnit, blockDragState, containerRef } = useTimeline()
    const index = lanes.findIndex((l) => l.id === id)
    const lastPointerTypeRef = useRef('')

    const interval = getMarkerInterval(effectiveZoom, total)
    const markers = buildTimeMarkers(total, interval)

    const draggedInto = blockDragState?.type === 'move' && blockDragState.laneId === id
        ? lanes.flatMap((l) => l.blocks).find((b) => b.id === blockDragState.blockId)
        : null

    const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!onClickAt || lastPointerTypeRef.current === 'touch') return
        const container = containerRef.current
        if (!container) return
        const rect = container.getBoundingClientRect()
        const x = e.clientX - rect.left + container.scrollLeft - TIMELINE_HORIZONTAL_PADDING
        onClickAt(Math.max(0, Math.floor(x / pixelsPerUnit)))
    }, [onClickAt, containerRef, pixelsPerUnit])

    return (
        <LaneProvider laneId={id} index={index}>
            <div
                data-lane-id={id}
                className={cn('border-b border-secondary relative', onClickAt && 'cursor-crosshair', className)}
                style={{ height: LANE_HEIGHT }}
                onPointerDown={(e) => { lastPointerTypeRef.current = e.pointerType }}
                onClick={handleClick}
            >
                {markers.map((value) => (
                    <div
                        key={value}
                        className="absolute top-0 bottom-0 w-px bg-secondary"
                        style={{ left: value * pixelsPerUnit + TIMELINE_HORIZONTAL_PADDING }}
                    />
                ))}

                {children}

                {draggedInto && (
                    <div
                        className="absolute top-0 bottom-0 w-0.5 bg-brand z-20 pointer-events-none"
                        style={{ left: draggedInto.start * pixelsPerUnit + TIMELINE_HORIZONTAL_PADDING }}
                    />
                )}
            </div>
        </LaneProvider>
    )
}
