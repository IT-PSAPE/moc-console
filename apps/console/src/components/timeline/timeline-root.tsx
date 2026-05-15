import { cn } from '@moc/utils/cn'
import type { ReactNode } from 'react'
import { Paragraph } from '@moc/ui/components/display/text'
import type { Track } from '@moc/types/cue-sheet'
import { TimelineProvider, type TimelinePlaybackSync } from './timeline-context'
import { TimelineCanvas } from './timeline-canvas'
import { TimelineSidebar } from './timeline-sidebar'

// ─── Root ──────────────────────────────────────────────────────────

type TimelineRootProps = {
    tracks: Track[]
    totalMin: number
    onChange?: (tracks: Track[]) => void
    children?: ReactNode
    className?: string
    readOnly?: boolean
    playbackSync?: TimelinePlaybackSync | null
    initialPlayback?: { currentTimeMinutes: number; isPlaying: boolean }
}

export function TimelineRoot({ tracks, totalMin, onChange, children, className, readOnly, playbackSync, initialPlayback }: TimelineRootProps) {
    if (totalMin === 0) {
        return (
            <div className="flex items-center justify-center py-12">
                <Paragraph.sm className="text-tertiary">Set the event duration to see the timeline.</Paragraph.sm>
            </div>
        )
    }

    return (
        <TimelineProvider
            tracks={tracks}
            totalMinutes={totalMin}
            onChange={onChange}
            readOnly={readOnly}
            playbackSync={playbackSync}
            initialPlayback={initialPlayback}
        >
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
