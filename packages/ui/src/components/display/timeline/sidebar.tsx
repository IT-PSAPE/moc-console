import type { ReactNode } from 'react'
import { cn } from '@moc/utils/cn'
import { RULER_HEIGHT, SIDEBAR_WIDTH } from './types'

/** Fixed-width column that sits beside <Timeline.Canvas>. */
export function TimelineSidebar({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div
            className={cn('flex min-h-0 shrink-0 flex-col border-r border-secondary bg-secondary_alt', className)}
            style={{ width: SIDEBAR_WIDTH }}
        >
            {children}
        </div>
    )
}

/** Header strip aligned to the ruler height (compose play/clock here). */
export function TimelineSidebarHeader({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div
            className={cn('border-b border-secondary px-2.5 flex items-center gap-1.5', className)}
            style={{ height: RULER_HEIGHT }}
        >
            {children}
        </div>
    )
}

/** Scroll region that holds the lane headers; aligns row-for-row with Canvas. */
export function TimelineLaneList({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn('min-h-0 flex-1 overflow-y-auto', className)}>{children}</div>
}
