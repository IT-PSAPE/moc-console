import { cn } from '@moc/utils/cn'
import { useTimeline } from './context'
import { TIMELINE_HORIZONTAL_PADDING } from './types'

const ARROW = (
    <svg height="100%" viewBox="0 0 20 41" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 30.306V2C0 0.89543 0.895431 0 2 0H18C19.1046 0 20 0.895429 20 2V30.306C20 30.8414 19.7853 31.3545 19.404 31.7303L11.404 39.6161C10.6253 40.3836 9.37465 40.3836 8.596 39.6161L0.595997 31.7303C0.214684 31.3545 0 30.8414 0 30.306Z" fill="currentColor" />
    </svg>
)

/** Scrubbable playhead — drag the handle to seek through the Transport. */
export function TimelinePlayhead({ className }: { className?: string }) {
    const { currentTime, pixelsPerUnit, handlePlayheadPointerDown } = useTimeline()
    const left = Math.round(currentTime * pixelsPerUnit + TIMELINE_HORIZONTAL_PADDING)

    return (
        <>
            <div
                className={cn('absolute top-0 bottom-0 -translate-x-1/2 w-px bg-utility-green-500 pointer-events-none z-20', className)}
                style={{ left }}
            />
            <button
                type="button"
                onPointerDown={handlePlayheadPointerDown}
                aria-label="Drag playhead"
                className="absolute top-0 z-30 h-10 w-10 -translate-x-1/2 flex items-center justify-center pb-2 text-utility-green-500 touch-none"
                style={{ left }}
            >
                {ARROW}
            </button>
        </>
    )
}

/** Inert position indicator — a marker with no scrub affordance. */
export function TimelinePlayheadMarker({ className }: { className?: string }) {
    const { currentTime, pixelsPerUnit } = useTimeline()
    const left = Math.round(currentTime * pixelsPerUnit + TIMELINE_HORIZONTAL_PADDING)
    return (
        <div
            className={cn('absolute top-0 bottom-0 -translate-x-1/2 w-px bg-utility-green-500 pointer-events-none z-20', className)}
            style={{ left }}
        />
    )
}
