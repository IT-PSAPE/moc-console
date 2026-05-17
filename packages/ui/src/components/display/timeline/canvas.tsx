import { cn } from '@moc/utils/cn'
import type { ReactNode } from 'react'
import { useTimeline } from './context'
import { TIMELINE_HORIZONTAL_PADDING } from './types'

/**
 * The scrollable time surface. Owns the horizontal scroll + the sized inner
 * area every time-positioned part (Lane, Block, Playhead) is measured against.
 */
export function TimelineCanvas({ children, className }: { children: ReactNode; className?: string }) {
    const { total, pixelsPerUnit, onContainerRef, laneRowsRef } = useTimeline()
    const width = total * pixelsPerUnit + 2 * TIMELINE_HORIZONTAL_PADDING

    return (
        <div
            ref={onContainerRef}
            className={cn('min-h-0 flex-1 overflow-auto touch-auto overscroll-contain', className)}
        >
            <div
                ref={laneRowsRef}
                className="relative min-h-full overflow-x-clip"
                style={{ width, minWidth: '100%' }}
            >
                {children}
            </div>
        </div>
    )
}
