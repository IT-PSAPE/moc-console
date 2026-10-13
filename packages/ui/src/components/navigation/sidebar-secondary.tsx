import type { HTMLAttributes } from 'react'
import { cn } from '@moc/utils/cn'
import { useSidebar } from './sidebar-context'

export function SidebarSecondary({ className, ...props }: HTMLAttributes<HTMLElement>) {
    const { state } = useSidebar()
    return <nav className={cn('flex min-h-0 min-w-0 flex-1 flex-col md:w-sidebar md:flex-none', state.isCollapsed && 'md:hidden', className)} {...props} />
}
