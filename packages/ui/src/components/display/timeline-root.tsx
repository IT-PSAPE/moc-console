import type { HTMLAttributes } from 'react'
import { cn } from '@moc/utils/cn'

export function TimelineRoot({ children, className, ...props }: HTMLAttributes<HTMLOListElement>) {
    return <ol role="list" {...props} className={cn('flex min-w-0 flex-col', className)}>{children}</ol>
}
