import type { HTMLAttributes } from 'react'
import { cn } from '@moc/utils/cn'

export function MessageBubbleFooter({ children, className, ...props }: HTMLAttributes<HTMLElement>) {
    return <footer className={cn("flex min-h-4 items-center justify-end pt-1 text-xs leading-4 tabular-nums text-quaternary", className)} {...props}>{children}</footer>
}
