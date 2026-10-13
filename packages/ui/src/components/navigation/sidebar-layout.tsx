import type { HTMLAttributes } from 'react'
import { cn } from '@moc/utils/cn'

export function SidebarLayout({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('flex h-full min-h-0 min-w-0', className)} {...props} />
}
