import type { HTMLAttributes } from 'react'
import { cn } from '@moc/utils/cn'

export function TimelineMarker({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <div {...props} className={cn('relative flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-tertiary [&_svg]:size-4', className)}>{children}</div>
}
