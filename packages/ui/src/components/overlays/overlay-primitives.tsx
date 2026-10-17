import { cn } from '@moc/utils/cn'
import { type HTMLAttributes } from 'react'

// ─── Header ──────────────────────────────────────────────────────────

type OverlayHeaderProps = HTMLAttributes<HTMLDivElement>
export const overlayHeaderClassName = 'flex shrink-0 items-center gap-3 min-h-14 px-5 py-3 border-b border-secondary'

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
        <div className={cn('min-h-0 flex flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-5 py-4', className)} {...props}>
            {children}
        </div>
    )
}

// ─── Footer ──────────────────────────────────────────────────────────

type OverlayFooterProps = HTMLAttributes<HTMLDivElement>

export function OverlayFooter({ children, className, ...props }: OverlayFooterProps) {
    return (
        <div className={cn('flex shrink-0 items-center justify-end gap-2 border-t border-secondary px-5 py-3 landscape:flex-col-reverse landscape:*:w-full landscape:pb-[max(0.75rem,env(safe-area-inset-bottom))]', className)} {...props}>
            {children}
        </div>
    )
}
