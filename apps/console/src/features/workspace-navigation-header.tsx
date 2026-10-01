import { ChevronDown, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { Button } from '@moc/ui/components/controls/button'
import { NavigationList } from '@moc/ui/components/navigation/navigation-list'
import { Sidebar, useSidebar } from '@moc/ui/components/navigation/sidebar'
import { Dropdown } from '@moc/ui/components/overlays/dropdown'
import { useIsMobile } from '@moc/ui/hooks/use-is-mobile'
import { useWorkspaceSwitcher } from './use-workspace-switcher'
import { WorkspaceMenuItems } from './workspace-menu-items'

type WorkspaceNavigationHeaderProps = { onCloseMobileNavigation: () => void }

export function WorkspaceNavigationHeader({ onCloseMobileNavigation }: WorkspaceNavigationHeaderProps) {
    const { state, actions } = useSidebar()
    const { meta } = useWorkspaceSwitcher()
    const isMobile = useIsMobile()

    return (
        <Sidebar.Header className="border-b-0 py-3">
            {state.isCollapsed && !isMobile ? (
                <Button variant="ghost" onClick={actions.toggleCollapsed} aria-label="Expand sidebar" className="group size-9 p-1">
                    <img src="/logo.svg" alt="" className="size-6 rounded-md bg-brand_solid p-0.5 group-hover:hidden group-focus-visible:hidden" />
                    <PanelLeftOpen className="hidden size-5 group-hover:block group-focus-visible:block" aria-hidden="true" />
                </Button>
            ) : (
                <>
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
                    <Button.Icon variant="ghost" onClick={isMobile ? onCloseMobileNavigation : actions.toggleCollapsed} aria-label={isMobile ? 'Close navigation' : 'Collapse sidebar'} className="shrink-0" icon={isMobile ? <X /> : <PanelLeftClose />} />
                </>
            )}
        </Sidebar.Header>
    )
}
