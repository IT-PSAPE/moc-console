import type { HTMLAttributes } from 'react'
import { cn } from '@moc/utils/cn'
import { useSidebar } from './sidebar-context'
import { useIsLandscape } from '../../hooks/use-is-landscape'

export function SidebarSecondary({ className, ...props }: HTMLAttributes<HTMLElement>) {
    const { state } = useSidebar()
    const isLandscape = useIsLandscape()
    const isHidden = state.isCollapsed && !isLandscape
    return <nav inert={isHidden} aria-hidden={isHidden || undefined} className={cn('flex min-h-0 min-w-0 flex-none flex-col overflow-hidden border-secondary transition-[width,opacity] duration-200 landscape:flex-1 landscape:transition-none motion-reduce:transition-none', state.isCollapsed ? 'w-0 opacity-0 landscape:w-auto landscape:opacity-100' : 'w-sidebar border-r landscape:w-auto landscape:border-r-0', className)} {...props} />
}
