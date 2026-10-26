import type { HTMLAttributes } from 'react'
import { cn } from '@moc/utils/cn'

export function TimelineItem({ children, className, ...props }: HTMLAttributes<HTMLLIElement>) {
    return <li {...props} className={cn('relative grid min-w-0 grid-cols-[2rem_minmax(0,1fr)] gap-x-3 pb-6 last:pb-0 before:absolute before:bottom-0 before:left-4 before:top-9 before:border-l before:border-secondary last:before:hidden', className)}>{children}</li>
}
