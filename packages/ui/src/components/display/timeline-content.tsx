import type { HTMLAttributes } from 'react'
import { cn } from '@moc/utils/cn'

export function TimelineContent({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <div {...props} className={cn('flex min-w-0 flex-col gap-1 pt-0.5', className)}>{children}</div>
}
