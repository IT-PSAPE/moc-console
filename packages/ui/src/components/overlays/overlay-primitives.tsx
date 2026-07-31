import { cn } from '@moc/utils/cn'
import { type HTMLAttributes } from 'react'

// ─── Header ──────────────────────────────────────────────────────────

type OverlayHeaderProps = HTMLAttributes<HTMLDivElement>

export function OverlayHeader({ children, className, ...props }: OverlayHeaderProps) {
    return (
        <div className={cn('flex items-center gap-2 border-b border-secondary p-3', className)} {...props}>
            {children}
        </div>
    )
}

// ─── Content ─────────────────────────────────────────────────────────

type OverlayContentProps = HTMLAttributes<HTMLDivElement>

export function OverlayContent({ children, className, ...props }: OverlayContentProps) {
    return (
        <div className={cn('min-h-0 flex flex-1 flex-col overflow-y-auto', className)} {...props}>
            {children}
        </div>
    )
}

// ─── Footer ──────────────────────────────────────────────────────────

type OverlayFooterProps = HTMLAttributes<HTMLDivElement>

export function OverlayFooter({ children, className, ...props }: OverlayFooterProps) {
    return (
        <div className={cn('flex items-center gap-2 border-t border-secondary p-3', className)} {...props}>
            {children}
        </div>
    )
}
