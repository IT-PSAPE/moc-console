import { cn } from '@moc/utils/cn'
import { type HTMLAttributes } from 'react'

// ─── Header ──────────────────────────────────────────────────────────

type OverlayHeaderProps = HTMLAttributes<HTMLDivElement>
export const overlayHeaderClassName = 'flex min-h-14 shrink-0 items-center gap-2 border-b border-secondary px-3 py-2'

export function OverlayHeader({ children, className, ...props }: OverlayHeaderProps) {
    return (
        <div className={cn(overlayHeaderClassName, className)} {...props}>
            {children}
        </div>
    )
}

// ─── Content ─────────────────────────────────────────────────────────

type OverlayContentProps = HTMLAttributes<HTMLDivElement>

export function OverlayContent({ children, className, ...props }: OverlayContentProps) {
    return (
        <div className={cn('min-h-0 flex flex-1 flex-col overflow-y-auto overscroll-contain', className)} {...props}>
            {children}
        </div>
    )
}

// ─── Footer ──────────────────────────────────────────────────────────

type OverlayFooterProps = HTMLAttributes<HTMLDivElement>

export function OverlayFooter({ children, className, ...props }: OverlayFooterProps) {
    return (
        <div className={cn('flex shrink-0 flex-col items-center gap-2 border-t border-secondary px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] *:w-full [&_button]:w-full md:flex-row md:p-3 md:*:w-auto md:[&_button]:w-auto', className)} {...props}>
            {children}
        </div>
    )
}
