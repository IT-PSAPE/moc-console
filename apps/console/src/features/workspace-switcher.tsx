import { ChevronDown, LogOut, Settings, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar } from '@moc/ui/components/display/avatar'
import { Label } from '@moc/ui/components/display/text'
import { ListItemCard } from '@moc/ui/components/display/list-item-card'
import { NavigationList } from '@moc/ui/components/navigation/navigation-list'
import { Dropdown } from '@moc/ui/components/overlays/dropdown'
import { cn } from '@moc/utils/cn'
import { WorkspaceMenuItems } from './workspace-menu-items'
import { useWorkspaceSwitcher } from './use-workspace-switcher'

type WorkspaceSwitcherProps = {
    isSigningOut: boolean
    onEditProfile: () => void
    onSignOut: () => void
}

const menuItemClassName = 'min-h-11 gap-2 px-2 py-1.5 md:min-h-9 md:py-1.5'

export function WorkspaceSwitcher({ isSigningOut, onEditProfile, onSignOut }: WorkspaceSwitcherProps) {
    const { meta } = useWorkspaceSwitcher()


    return (
        <Dropdown placement="top-start">
            <Dropdown.Trigger>
                <NavigationList.Item aria-label={`Account menu for ${meta.displayName}. Current workspace: ${meta.workspaceName}`} className={cn('gap-1.5 px-2 py-1', meta.isCollapsed && 'justify-center px-1')}>
                    <Avatar src={meta.avatarUrl} name={meta.initials} size="xs" />
                    {!meta.isCollapsed && (
                        <>
                            <Label.sm className="min-w-0 truncate text-inherit">{meta.firstName}</Label.sm>
                            {meta.roleName && <Label.xs className="min-w-0 truncate text-tertiary">{meta.roleName}</Label.xs>}
                            <ChevronDown className="ml-auto size-4 shrink-0 text-tertiary" aria-hidden="true" />
                        </>
                    )}
                </NavigationList.Item>
            </Dropdown.Trigger>
            <Dropdown.Panel className="w-72 p-1.5">
                <ListItemCard.Root className="items-center gap-2 px-2 py-2 md:px-2">
                    <Avatar src={meta.avatarUrl} name={meta.initials} size="sm" />
                    <ListItemCard.Content>
                        <div className="flex min-w-0 items-center gap-2">
                            <ListItemCard.Title>{meta.displayName}</ListItemCard.Title>
                            {meta.roleName && <Label.xs className="shrink-0 text-tertiary">{meta.roleName}</Label.xs>}
                        </div>
                        <ListItemCard.Subtitle>{meta.email}</ListItemCard.Subtitle>
                    </ListItemCard.Content>
                </ListItemCard.Root>
                <Dropdown.Separator />
                <Dropdown.Link render={<Link to="/account/settings" />} className={menuItemClassName}>
                    <Settings className="size-6 shrink-0 p-1" aria-hidden="true" />
                    Settings
                </Dropdown.Link>
                <Dropdown.Item onSelect={onEditProfile} className={menuItemClassName}>
                    <UserRound className="size-6 shrink-0 p-1" aria-hidden="true" />
                    Edit profile
                </Dropdown.Item>
                <Dropdown.Separator />
                <WorkspaceMenuItems />
                <Dropdown.Separator />
                <Dropdown.Item onSelect={onSignOut} disabled={isSigningOut} className={menuItemClassName}>
                    <LogOut className="size-6 shrink-0 p-1 text-error" aria-hidden="true" />
                    <span className="text-error">{isSigningOut ? 'Logging out…' : 'Log out'}</span>
                </Dropdown.Item>
            </Dropdown.Panel>
        </Dropdown>
    )
}
