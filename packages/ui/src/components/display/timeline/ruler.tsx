import { useCallback } from 'react'
import { cn } from '@moc/utils/cn'
import { useTimeline } from './context'
import { RULER_HEIGHT, TIMELINE_HORIZONTAL_PADDING, buildTimeMarkers, formatClock, getMarkerInterval } from './types'

type RulerProps = {
    /** Label formatter for axis ticks. Defaults to mm:ss. */
    format?: (value: number) => string
    className?: string
}

/**
 * The time axis. Click-to-seek is wired through the Transport — if you want a
 * read-only axis, compose <Timeline.PlayheadMarker> instead of <Timeline.Playhead>;
 * the click still seeks (operators scrub live events). Truly inert surfaces just
 * don't give the user a way to reach this (public view composes a smaller tree).
 */
export function TimelineRuler({ format = formatClock, className }: RulerProps) {
    const { total, effectiveZoom, pixelsPerUnit, seek, containerRef } = useTimeline()
    const interval = getMarkerInterval(effectiveZoom, total)
    const markers = buildTimeMarkers(total, interval)

    const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const container = containerRef.current
        if (!container) return
        const rect = container.getBoundingClientRect()
        const x = e.clientX - rect.left + container.scrollLeft - TIMELINE_HORIZONTAL_PADDING
        seek(Math.max(0, Math.min(total, x / pixelsPerUnit)))
    }, [containerRef, seek, total, pixelsPerUnit])

    return (
        <div
            className={cn('sticky top-0 z-10 border-b border-secondary bg-secondary_alt select-none cursor-pointer', className)}
            style={{ height: RULER_HEIGHT }}
            onClick={handleClick}
        >
            {markers.map((value, idx) => {
                const isFirst = idx === 0
                const isLast = idx === markers.length - 1
                const labelTransform = isFirst ? 'translateX(0)' : isLast ? 'translateX(-100%)' : 'translateX(-50%)'
                return (
                    <div key={value} className="absolute top-0 bottom-0" style={{ left: value * pixelsPerUnit + TIMELINE_HORIZONTAL_PADDING }}>
                        <div className="absolute bottom-4 w-px h-3 bg-tertiary -translate-x-1/2" />
                        <span className="absolute bottom-1 text-[10px] text-quaternary whitespace-nowrap px-1" style={{ transform: labelTransform }}>
                            {format(value)}
                        </span>
                    </div>
                )
            })}
        </div>
    )
}
