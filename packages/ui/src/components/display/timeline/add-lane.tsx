import type { ReactNode } from 'react'
import { cn } from '@moc/utils/cn'
import { useTimeline } from './context'
import { LANE_HEIGHT } from './types'

type AddLaneProps = {
    /** Defaults for the created lane (e.g. a domain type token). */
    defaults?: { type?: string; data?: unknown }
    /** Called with the new lane id after creation. */
    onAdded?: (laneId: string) => void
    children: ReactNode
    className?: string
}

/**
 * Compose this into the sidebar to allow adding lanes. Omit it and lanes can't
 * be added — read-only is a smaller tree (see ADR-0003).
 */
export function TimelineAddLane({ defaults, onAdded, children, className }: AddLaneProps) {
    const { addLane } = useTimeline()
    return (
        <div className="border-b border-secondary/50 px-3 flex items-center" style={{ height: LANE_HEIGHT }}>
            <button
                type="button"
                className={cn('flex items-center gap-2 text-sm text-tertiary hover:text-brand transition-colors w-full', className)}
                onClick={() => {
                    const id = addLane(defaults)
                    onAdded?.(id)
                }}
            >
                {children}
            </button>
        </div>
    )
}
