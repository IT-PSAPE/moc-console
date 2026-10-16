import { Tooltip } from '@base-ui/react/tooltip'
import type { ComponentProps } from 'react'
import { SidebarRailButton } from './sidebar-rail-button'

type SidebarRailItemProps = ComponentProps<typeof SidebarRailButton>

export function SidebarRailItem({ title, icon, className, ...props }: SidebarRailItemProps) {
    return (
        <Tooltip.Root>
            <Tooltip.Trigger render={<SidebarRailButton {...props} title={title} icon={icon} className={className} />} />
            <Tooltip.Portal>
                <Tooltip.Positioner side="right" sideOffset={8} className="z-[9100]">
                    <Tooltip.Popup className="rounded-md border border-secondary bg-primary px-2 py-1 label-xs text-primary shadow-md">{title}</Tooltip.Popup>
                </Tooltip.Positioner>
            </Tooltip.Portal>
        </Tooltip.Root>
    )
}
