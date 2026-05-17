import { type ReactNode } from 'react'
import { cn } from '@moc/utils/cn'
import { LaneProvider, useLane, useTimeline } from './context'
import { LANE_HEIGHT } from './types'

type LaneHeaderProps = {
    id: string
    children?: ReactNode
    className?: string
}

/**
 * A sidebar row, row-for-row aligned with its <Timeline.Lane>. Provides lane
 * context so children (and <LaneHeader.DragHandle>) need no prop drilling.
 */
export function TimelineLaneHeader({ id, children, className }: LaneHeaderProps) {
    const { lanes, laneDragState } = useTimeline()
    const index = lanes.findIndex((l) => l.id === id)
    const isDragSource = laneDragState?.laneId === id
    const isDragTarget = laneDragState !== null && laneDragState.laneId !== id && laneDragState.currentIndex === index

    return (
        <LaneProvider laneId={id} index={index}>
            <div
                data-lane-header
                className={cn('relative flex items-center gap-1.5 border-b border-secondary px-1.5 transition-colors', isDragSource && 'bg-brand/5', className)}
                style={{ height: LANE_HEIGHT }}
            >
                {isDragTarget && (
                    <div className="absolute inset-x-0 top-0 h-0 z-10 flex items-center justify-center">
                        <div className="w-full h-0.5 bg-brand shadow-sm" />
                    </div>
                )}
                {children}
            </div>
        </LaneProvider>
    )
}

/** Grab handle that reorders lanes. Wrap your own grip icon as children. */
function LaneHeaderDragHandle({ children, className }: { children: ReactNode; className?: string }) {
    const { handleLaneDragStart } = useTimeline()
    const { laneId, index } = useLane()
    return (
        <div
            className={cn('shrink-0 cursor-grab active:cursor-grabbing touch-none', className)}
            onPointerDown={(e) => handleLaneDragStart(laneId, index, e)}
        >
            {children}
        </div>
    )
}

/** Delete trigger for this lane (and its blocks). Wrap your own icon. */
function LaneHeaderRemove({ children, className }: { children: ReactNode; className?: string }) {
    const { removeLane } = useTimeline()
    const { laneId } = useLane()
    return (
        <button
            type="button"
            className={cn('relative z-20 shrink-0', className)}
            onClick={(e) => {
                e.stopPropagation()
                removeLane(laneId)
            }}
        >
            {children}
        </button>
    )
}

TimelineLaneHeader.DragHandle = LaneHeaderDragHandle
TimelineLaneHeader.Remove = LaneHeaderRemove
