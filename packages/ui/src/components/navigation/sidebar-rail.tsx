import type { HTMLAttributes } from 'react'
import { cn } from '@moc/utils/cn'

export function SidebarRail({ className, ...props }: HTMLAttributes<HTMLElement>) {
    return <nav aria-label="Main navigation" className={cn('flex w-sidebar-collapsed shrink-0 flex-col items-center gap-2 border-r border-secondary px-1.5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]', className)} {...props} />
}
