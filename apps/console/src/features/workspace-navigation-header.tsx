import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { Avatar } from '@moc/ui/components/display/avatar'
import { Button } from '@moc/ui/components/controls/button'
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
        <Sidebar.Header>
            <Dropdown placement="bottom-start">
                <Dropdown.Trigger>
                    <Button.Unstyled aria-label={`Switch workspace. Current workspace: ${meta.workspaceName}`} className="flex h-control min-w-0 flex-1 items-center gap-2 rounded-lg px-3 label-sm text-tertiary transition-colors hover:bg-secondary hover:text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-brand landscape:h-control-lg">
                        <Avatar.initials size="xs" name={meta.currentWorkspaceInitials} />
                        <span className="min-w-0 flex-1 truncate text-left">{meta.workspaceName}</span>
                        <ChevronDown className="size-4 shrink-0 text-quaternary" aria-hidden="true" />
                    </Button.Unstyled>
                </Dropdown.Trigger>
                <Dropdown.Panel className="w-72 p-1.5"><WorkspaceMenuItems /></Dropdown.Panel>
            </Dropdown>
            <Button.Icon variant="ghost" size="sm" aria-label={toggleLabel} title={toggleLabel} icon={toggleIcon} onClick={onToggle} />
        </Sidebar.Header>
    )
}
