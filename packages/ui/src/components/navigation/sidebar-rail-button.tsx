import { cn } from '@moc/utils/cn'
import type { ComponentProps, ReactNode } from 'react'
import { NavigationList } from './navigation-list'

type SidebarRailButtonProps = Omit<ComponentProps<typeof NavigationList.Item>, 'children'> & {
    title: string
    icon: ReactNode
}

export function SidebarRailButton({ title, icon, className, ...props }: SidebarRailButtonProps) {
    return <NavigationList.Item {...props} aria-label={title} className={cn('size-11 shrink-0 justify-center p-2 min-h-11 [&_svg]:size-5', className)}>{icon}</NavigationList.Item>
}
