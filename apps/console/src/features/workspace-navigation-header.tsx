import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@moc/ui/components/controls/button'
import { NavigationList } from '@moc/ui/components/navigation/navigation-list'
import { Sidebar } from '@moc/ui/components/navigation/sidebar'
import { Dropdown } from '@moc/ui/components/overlays/dropdown'
import { useWorkspaceSwitcher } from './use-workspace-switcher'
import { WorkspaceMenuItems } from './workspace-menu-items'

type WorkspaceNavigationHeaderProps = {
    onToggle: () => void
    toggleLabel: string
    toggleIcon: ReactNode
}

export function WorkspaceNavigationHeader({ onToggle, toggleLabel, toggleIcon }: WorkspaceNavigationHeaderProps) {
    const { meta } = useWorkspaceSwitcher()

    return (
        <Sidebar.Header className="border-b-0 pt-3 pb-1 [&>div]:gap-1">
            <Dropdown placement="bottom-start">
                <Dropdown.Trigger>
                    <NavigationList.Item aria-label={`Switch workspace. Current workspace: ${meta.workspaceName}`} className="min-w-0 flex-1 gap-2 px-1 py-1">
                        <img src="/logo.svg" alt="" className="size-6 shrink-0 rounded-md bg-brand_solid p-0.5" />
                        <span className="min-w-0 truncate">{meta.workspaceName}</span>
                        <ChevronDown className="size-3 shrink-0 text-tertiary" aria-hidden="true" />
                    </NavigationList.Item>
                </Dropdown.Trigger>
                <Dropdown.Panel className="w-72 p-1.5"><WorkspaceMenuItems /></Dropdown.Panel>
            </Dropdown>
            <Button.Icon variant="ghost" aria-label={toggleLabel} title={toggleLabel} icon={toggleIcon} onClick={onToggle} className="size-8 min-h-8 shrink-0 p-1.5" />
        </Sidebar.Header>
    )
}
