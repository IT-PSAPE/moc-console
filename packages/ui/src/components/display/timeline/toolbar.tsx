import type { ReactNode } from 'react'
import { cn } from '@moc/utils/cn'
import { Minus, Pause, Play, Plus } from 'lucide-react'
import { useTimeline } from './context'
import { formatClock } from './types'

/** A styled bar above the viewport. Compose title/actions/zoom as children. */
export function TimelineToolbar({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={cn('flex items-center gap-2 px-3 py-2 border-b border-secondary bg-secondary_alt', className)}>
            {children}
        </div>
    )
}

function ZoomOut({ className }: { className?: string }) {
    const { updateZoomAnchoredToPlayhead } = useTimeline()
    return (
        <button type="button" aria-label="Zoom out" onClick={() => updateZoomAnchoredToPlayhead('out')}
            className={cn('w-7 h-7 flex items-center justify-center rounded hover:bg-primary_hover transition-colors text-tertiary', className)}>
            <Minus className="size-4" />
        </button>
    )
}

function ZoomIn({ className }: { className?: string }) {
    const { updateZoomAnchoredToPlayhead } = useTimeline()
    return (
        <button type="button" aria-label="Zoom in" onClick={() => updateZoomAnchoredToPlayhead('in')}
            className={cn('w-7 h-7 flex items-center justify-center rounded hover:bg-primary_hover transition-colors text-tertiary', className)}>
            <Plus className="size-4" />
        </button>
    )
}

/** Play/pause toggle wired to the Transport. */
function PlayToggle({ className }: { className?: string }) {
    const { isPlaying, toggle } = useTimeline()
    return (
        <button type="button" onClick={toggle} aria-label={isPlaying ? 'Pause' : 'Play'}
            className={cn('shrink-0 w-7 h-7 flex items-center justify-center rounded hover:bg-primary_hover transition-colors', className)}>
            {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        </button>
    )
}

/** Current / total time read-out. */
function Clock({ format = formatClock, className }: { format?: (v: number) => string; className?: string }) {
    const { currentTime, total } = useTimeline()
    return (
        <span className={cn('whitespace-nowrap text-center text-[10px] leading-none font-mono font-medium text-secondary tabular-nums', className)}>
            {format(currentTime)} / {format(total)}
        </span>
    )
}

TimelineToolbar.ZoomIn = ZoomIn
TimelineToolbar.ZoomOut = ZoomOut
TimelineToolbar.PlayToggle = PlayToggle
TimelineToolbar.Clock = Clock

export { ZoomIn as TimelineZoomIn, ZoomOut as TimelineZoomOut, PlayToggle as TimelinePlayToggle, Clock as TimelineClock }
