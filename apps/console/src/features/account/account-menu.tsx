import { Link } from 'react-router-dom'
import { LogOut, UserRound } from 'lucide-react'
import { Button } from '@moc/ui/components/controls/button'
import { Avatar } from '@moc/ui/components/display/avatar'
import { Label } from '@moc/ui/components/display/text'
import { UserAvatar } from '@moc/ui/components/display/user-avatar'
import { Dropdown } from '@moc/ui/components/overlays/dropdown'
import { useSidebar } from '@moc/ui/components/navigation/sidebar'
import { cn } from '@moc/utils/cn'
import { useAuth } from '@/lib/auth-context'
import { routes } from '@/screens/console-routes'

type AccountMenuProps = {
    isSigningOut: boolean
    onSignOut: () => void
}

export function AccountMenu({ isSigningOut, onSignOut }: AccountMenuProps) {
    const { state: sidebarState } = useSidebar()
    const { profile, role } = useAuth()
    const userInitials = profile ? `${profile.name[0] ?? ''}${profile.surname[0] ?? ''}` : 'MC'
    const userDisplayName = profile ? `${profile.name} ${profile.surname}` : 'MOC Member'
    const roleName = role?.name ?? 'No role'

    return (
        <Dropdown placement="top-start">
            <Dropdown.Trigger>
                <Button
                    aria-label="Open account menu"
                    variant="ghost"
                    className={cn('w-full justify-start !px-1', sidebarState.isCollapsed && 'justify-center')}
                >
                    {profile ? <UserAvatar size="sm" user={profile} /> : <Avatar.initials name={userInitials} size="sm" />}
                    {!sidebarState.isCollapsed && (
                        <span className="flex min-w-0 flex-1 flex-col items-start">
                            <Label.sm className="max-w-full truncate">{userDisplayName}</Label.sm>
                            <Label.xs className="max-w-full truncate capitalize text-quaternary">{roleName}</Label.xs>
                        </span>
                    )}
                </Button>
            </Dropdown.Trigger>
            <Dropdown.Panel className="min-w-64">
                <div className="px-2 py-2">
                    <Label.sm className="block truncate">{userDisplayName}</Label.sm>
                    {profile?.email && <Label.xs className="block truncate text-quaternary">{profile.email}</Label.xs>}
                </div>
                <Dropdown.Separator />
                <Dropdown.Link render={<Link to={`/${routes.settings}?tab=profile`} />}>
                    <UserRound className="size-4" aria-hidden="true" />
                    Profile
                </Dropdown.Link>
                <Dropdown.Separator />
                <Dropdown.Item onSelect={onSignOut} disabled={isSigningOut}>
                    <LogOut className="size-4 text-error" aria-hidden="true" />
                    <span className="text-error">{isSigningOut ? 'Logging out…' : 'Log out'}</span>
                </Dropdown.Item>
            </Dropdown.Panel>
        </Dropdown>
    )
}
