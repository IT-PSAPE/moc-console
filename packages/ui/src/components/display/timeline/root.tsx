import { cn } from '@moc/utils/cn'
import type { ReactNode } from 'react'
import { TimelineProvider } from './context'
import { useClockTransport } from './transport'
import type { TimelineLane, TimelineTransport } from './types'

type TimelineRootProps = {
    lanes: TimelineLane[]
    /** Upper bound of the time axis, in time-units (e.g. minutes). */
    total: number
    onChange?: (lanes: TimelineLane[]) => void
    /**
     * Injected time source. When omitted a default wall-clock Transport is
     * created internally (play/pause/scrub work out of the box). See ADR-0003.
     */
    transport?: TimelineTransport
    children?: ReactNode
    className?: string
}

export function TimelineRoot({ lanes, total, onChange, transport, children, className }: TimelineRootProps) {
    const defaultTransport = useClockTransport({ duration: total })
    const activeTransport = transport ?? defaultTransport

    return (
        <TimelineProvider lanes={lanes} total={total} transport={activeTransport} onChange={onChange}>
            <div className={cn('bg-primary overflow-hidden flex flex-col', className)}>
                {children}
            </div>
        </TimelineProvider>
    )
}

// Flex row that places <Timeline.Sidebar> beside <Timeline.Canvas>.
export function TimelineViewport({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn('flex min-h-0 flex-1', className)}>{children}</div>
}
