import type { HTMLAttributes } from 'react'
import { cn } from '@moc/utils/cn'

export function MessageBubbleActionRow({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("grid min-w-0 auto-cols-fr grid-flow-col gap-1", className)} {...props}>{children}</div>
}
