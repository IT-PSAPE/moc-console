import { ChevronDown } from 'lucide-react'
import { NavigationList } from '@moc/ui/components/navigation/navigation-list'
import { Sidebar } from '@moc/ui/components/navigation/sidebar'
import { Dropdown } from '@moc/ui/components/overlays/dropdown'
import { useWorkspaceSwitcher } from './use-workspace-switcher'
import { WorkspaceMenuItems } from './workspace-menu-items'

export function WorkspaceNavigationHeader() {
    const { meta } = useWorkspaceSwitcher()

    return (
        <Sidebar.Header className="border-b-0 py-3">
            <Dropdown placement="bottom-start">
                <Dropdown.Trigger>
                    <NavigationList.Item aria-label={`Switch workspace. Current workspace: ${meta.workspaceName}`} className="min-w-0 flex-1 gap-2 px-1 py-1">
                        <span className="min-w-0 truncate">{meta.workspaceName}</span>
                        <ChevronDown className="size-3 shrink-0 text-tertiary" aria-hidden="true" />
                    </NavigationList.Item>
                </Dropdown.Trigger>
                <Dropdown.Panel className="w-72 p-1.5"><WorkspaceMenuItems /></Dropdown.Panel>
            </Dropdown>
        </Sidebar.Header>
    )
}
