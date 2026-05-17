import type { ReactNode } from 'react'
import { cn } from '@moc/utils/cn'

/**
 * Domain composition slot. The primitive renders nothing of its own here —
 * the playlist fills it with a lane-order compositor (see ADR-0004), the cue
 * sheet simply omits this part. Children read state via useTimeline /
 * useActiveBlocks. Presence = rendered.
 */
export function TimelinePreview({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn('relative', className)}>{children}</div>
}
