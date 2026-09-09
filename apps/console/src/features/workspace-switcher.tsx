import { Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@moc/ui/components/controls/button'
import { Label } from '@moc/ui/components/display/text'
import { Dropdown } from '@moc/ui/components/overlays/dropdown'
import { cn } from '@moc/utils/cn'
import { useWorkspaceSwitcher } from './use-workspace-switcher'

export function WorkspaceSwitcher() {
    const { actions, meta } = useWorkspaceSwitcher()

    return (
        <Dropdown placement="bottom-start">
            <Dropdown.Trigger>
                <Button
                    aria-label={`Switch workspace. Current workspace: ${meta.workspaceName}`}
                    variant="ghost"
                    className={cn('w-full justify-start !px-1', meta.isCollapsed && 'justify-center')}
                >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand_solid">
                        <img src="/logo.svg" alt="" width="32" height="32" />
                    </span>
                    {!meta.isCollapsed && (
                        <>
                            <span className="flex min-w-0 flex-1 flex-col items-start">
                                <Label.sm className="max-w-full truncate">{meta.workspaceName}</Label.sm>
                                <Label.xs className="text-quaternary">Workspace</Label.xs>
                            </span>
                            <ChevronsUpDown className="size-4 shrink-0 text-tertiary" aria-hidden="true" />
                        </>
                    )}
                </Button>
            </Dropdown.Trigger>
            <Dropdown.Panel className="min-w-64">
                <div className="px-2 py-1.5">
                    <Label.xs className="uppercase tracking-wide text-quaternary">Workspaces</Label.xs>
                </div>
                {meta.workspaces.map((workspace) => (
                    <Dropdown.Item key={workspace.id} data-workspace-id={workspace.id} onClick={actions.selectWorkspace}>
                        <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
                        {workspace.id === meta.currentWorkspaceId && <Check className="size-4 text-brand" aria-hidden="true" />}
                    </Dropdown.Item>
                ))}
            </Dropdown.Panel>
        </Dropdown>
    )
}
