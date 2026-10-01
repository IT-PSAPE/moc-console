import { Check } from 'lucide-react'
import { Avatar } from '@moc/ui/components/display/avatar'
import { Dropdown } from '@moc/ui/components/overlays/dropdown'
import { useWorkspaceSwitcher } from './use-workspace-switcher'

export function WorkspaceMenuItems() {
    const { actions, meta } = useWorkspaceSwitcher()

    function renderWorkspace(workspace: (typeof meta.workspaces)[number]) {
        return (
            <Dropdown.Item key={workspace.id} data-workspace-id={workspace.id} onClick={actions.selectWorkspace} className="min-h-11 gap-2 px-2 py-1.5 md:min-h-9" aria-label={`${workspace.name}${workspace.id === meta.currentWorkspaceId ? ', current workspace' : ''}`}>
                <Avatar.initials size="xs" name={workspace.initials} className="bg-secondary text-secondary" />
                <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
                {workspace.id === meta.currentWorkspaceId && <Check className="size-4 text-secondary" aria-hidden="true" />}
            </Dropdown.Item>
        )
    }

    return <>{meta.workspaces.map(renderWorkspace)}</>
}
