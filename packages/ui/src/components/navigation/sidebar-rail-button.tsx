import { cn } from '@moc/utils/cn'
import type { ComponentProps, ReactNode } from 'react'
import { NavigationList } from './navigation-list'

type SidebarRailButtonProps = Omit<ComponentProps<typeof NavigationList.Item>, 'children'> & {
    title: string
    icon: ReactNode
}

export function SidebarRailButton({ title, icon, className, ...props }: SidebarRailButtonProps) {
    return <NavigationList.Item {...props} aria-label={title} className={cn('!w-control !h-control landscape:!w-control-lg landscape:!h-control-lg shrink-0 justify-center px-0 [&_svg]:size-5', className)}>{icon}</NavigationList.Item>
}
