import type { HTMLAttributes } from 'react'
import { cn } from '@moc/utils/cn'

export function MessageBubbleRoot({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("flex w-fit min-w-0 max-w-full flex-col gap-1", className)} {...props}>{children}</div>
}
