import { useMemo } from 'react'
import { useTimeline } from './context'
import type { TimelineBlock, TimelineLane } from './types'

export type ActiveBlock = {
    lane: TimelineLane
    /** The block under the playhead on this lane, or null if none. */
    block: TimelineBlock | null
}

/**
 * The block under the playhead for every lane, in lane (tree) order.
 *
 * Lane order is the z-stack: index 0 is the bottom layer, the last lane is
 * the topmost. The playlist Preview composites these; an audio lane mixes
 * rather than stacks visually (the domain decides per lane type). See ADR-0004.
 */
export function useActiveBlocks(): ActiveBlock[] {
    const { lanes, currentTime } = useTimeline()
    return useMemo(
        () => lanes.map((lane) => ({
            lane,
            block: lane.blocks.find((b) => currentTime >= b.start && currentTime < b.start + b.duration) ?? null,
        })),
        [lanes, currentTime],
    )
}
