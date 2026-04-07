import { cn } from '@/utils/cn'
import type { ReactNode } from 'react'
import { Paragraph } from '@/components/display/text'
import type { Track } from '@/types/cue-sheet'
import { TimelineProvider } from './timeline-context'
import { TimelineCanvas } from './timeline-canvas'
import { TimelineSidebar } from './timeline-sidebar'

// ─── Root ──────────────────────────────────────────────────────────

type TimelineRootProps = {
    tracks: Track[]
    totalMin: number
    onChange?: (tracks: Track[]) => void
    children?: ReactNode
    className?: string
}

export function TimelineRoot({ tracks, totalMin, onChange, children, className }: TimelineRootProps) {
    if (totalMin === 0) {
        return (
            <div className="flex items-center justify-center py-12">
                <Paragraph.sm className="text-tertiary">Set the event duration to see the timeline.</Paragraph.sm>
            </div>
        )
    }

    return (
        <TimelineProvider tracks={tracks} totalMinutes={totalMin} onChange={onChange}>
            <div className={cn('bg-primary overflow-hidden flex flex-col', className)}>
                {/* Toolbar / children slot */}
                {children}

                {/* Split layout: sidebar + canvas */}
                <div className="flex min-h-0 flex-1">
                    <TimelineSidebar />
                    <TimelineCanvas />
                </div>
            </div>
        </TimelineProvider>
    )
}
