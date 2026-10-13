import { Tooltip } from '@base-ui/react/tooltip'
import { cn } from '@moc/utils/cn'
import type { ComponentProps, ReactNode } from 'react'
import { NavigationList } from './navigation-list'

type SidebarRailItemProps = Omit<ComponentProps<typeof NavigationList.Item>, 'children'> & {
    title: string
    icon: ReactNode
}

export function SidebarRailItem({ title, icon, className, ...props }: SidebarRailItemProps) {
    return (
        <Tooltip.Root>
            <Tooltip.Trigger render={<NavigationList.Item {...props} aria-label={title} className={cn('size-11 shrink-0 justify-center p-2 md:min-h-11 [&_svg]:size-5', className)} />}>{icon}</Tooltip.Trigger>
            <Tooltip.Portal>
                <Tooltip.Positioner side="right" sideOffset={8} className="z-[9100]">
                    <Tooltip.Popup className="rounded-md border border-secondary bg-primary px-2 py-1 label-xs text-primary shadow-md">{title}</Tooltip.Popup>
                </Tooltip.Positioner>
            </Tooltip.Portal>
        </Tooltip.Root>
    )
}
