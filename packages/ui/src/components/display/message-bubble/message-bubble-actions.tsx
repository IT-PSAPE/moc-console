import type { HTMLAttributes } from 'react'
import { cn } from '@moc/utils/cn'

export function MessageBubbleActions({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("flex min-w-0 flex-col gap-1", className)} {...props}>{children}</div>
}
