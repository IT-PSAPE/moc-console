import { Avatar } from '@/components/display/avatar'
import { Label } from '@/components/display/text'
import { Popover } from '@/components/overlays/popover'
import { useSidebar } from '@/components/navigation/sidebar'
import { useAuth } from '@/lib/auth-context'
import { useWorkspace } from '@/lib/workspace-context'
import { routes } from '@/screens/console-routes'
import { cn } from '@/utils/cn'
import {
    Bug,
    Check,
    ChevronsUpDown,
    Folder,
    LogOut,
    Settings,
    User,
} from 'lucide-react'
import { useCallback, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ReportBugModal } from './report-bug-modal'

type ProfilePopoverProps = {
    onSignOut: () => void
    isSigningOut: boolean
}

export function ProfilePopover({ onSignOut, isSigningOut }: ProfilePopoverProps) {
    const { state: sidebarState } = useSidebar()
    const { profile, role } = useAuth()
    const { workspaces, currentWorkspaceId, setCurrentWorkspaceId } = useWorkspace()
    const navigate = useNavigate()
    const [open, setOpen] = useState(false)
    const [bugOpen, setBugOpen] = useState(false)

    const userInitials = profile ? `${profile.name[0] ?? ''}${profile.surname[0] ?? ''}` : 'MC'
    const userDisplayName = profile ? `${profile.name} ${profile.surname}` : 'MoC Member'
    const roleName = role?.name ?? 'No role'

    const handleNavigate = useCallback((route: string) => {
        setOpen(false)
        navigate(`/${route}`)
    }, [navigate])

    const handleSelectWorkspace = useCallback((id: string) => {
        if (id !== currentWorkspaceId) {
            setCurrentWorkspaceId(id)
        }
        setOpen(false)
    }, [currentWorkspaceId, setCurrentWorkspaceId])

    const handleOpenBug = useCallback(() => {
        setOpen(false)
        setBugOpen(true)
    }, [])

    const handleSignOut = useCallback(() => {
        setOpen(false)
        onSignOut()
    }, [onSignOut])

    return (
        <div className="w-full [&>span]:!flex [&>span]:!w-full">
            <Popover placement="top" open={open} onOpenChange={setOpen}>
                <Popover.Trigger
                    className={cn(
                        '!flex !w-full !items-center gap-2 rounded-lg p-1 -m-1 cursor-pointer hover:bg-secondary',
                        sidebarState.isCollapsed && 'justify-center',
                    )}
                >
                    <Avatar.initials name={userInitials} size="sm" />
                    {!sidebarState.isCollapsed && (
                        <>
                            <span className="flex min-w-0 flex-1 flex-col text-left">
                                <Label.sm className="truncate leading-none">{userDisplayName}</Label.sm>
                                <Label.xs className="text-quaternary truncate leading-none capitalize">{roleName}</Label.xs>
                            </span>
                            <ChevronsUpDown className="size-4 shrink-0 text-tertiary" aria-hidden />
                        </>
                    )}
                </Popover.Trigger>

                <Popover.Panel className="!min-w-72 !p-1.5">
                    <div className="flex flex-col">
                        {workspaces.length > 0 && (
                            <>
                                <div className="px-2 pt-1.5 pb-1">
                                    <Label.xs className="text-quaternary uppercase tracking-wide">Workspaces</Label.xs>
                                </div>
                                {workspaces.map((workspace) => {
                                    const isActive = workspace.id === currentWorkspaceId
                                    return (
                                        <WorkspaceRow
                                            key={workspace.id}
                                            name={workspace.name}
                                            isActive={isActive}
                                            onSelect={() => handleSelectWorkspace(workspace.id)}
                                        />
                                    )
                                })}

                                <Separator />
                            </>
                        )}

                        <MenuRow icon={<User className="size-4" />} label="Profile" onSelect={() => handleNavigate(routes.profile)} />
                        <MenuRow icon={<Settings className="size-4" />} label="Settings" onSelect={() => handleNavigate(routes.settings)} />
                        <MenuRow icon={<Bug className="size-4" />} label="Report a bug" onSelect={handleOpenBug} />

                        <Separator />

                        <MenuRow
                            icon={<LogOut className="size-4 text-error" />}
                            label={isSigningOut ? 'Logging out...' : 'Log out'}
                            labelClassName="text-error"
                            onSelect={handleSignOut}
                            disabled={isSigningOut}
                        />
                    </div>
                </Popover.Panel>
            </Popover>

            <ReportBugModal open={bugOpen} onOpenChange={setBugOpen} />
        </div>
    )
}

function Separator() {
    return <div className="my-1 h-px bg-secondary mx-1" role="separator" />
}

type WorkspaceRowProps = {
    name: string
    isActive: boolean
    onSelect: () => void
}

function WorkspaceRow({ name, isActive, onSelect }: WorkspaceRowProps) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={cn(
                'flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left',
                'hover:bg-secondary',
            )}
        >
            <span className="flex size-5 shrink-0 items-center justify-center text-secondary">
                <Folder className="size-4" />
            </span>
            <Label.sm className="flex-1 truncate">{name}</Label.sm>
            {isActive && <Check className="size-4 shrink-0 text-brand" aria-hidden />}
        </button>
    )
}

type MenuRowProps = {
    icon: ReactNode
    label: string
    labelClassName?: string
    disabled?: boolean
    onSelect: () => void
}

function MenuRow({ icon, label, labelClassName, disabled, onSelect }: MenuRowProps) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onSelect}
            className={cn(
                'flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left',
                'hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed',
            )}
        >
            <span className="flex size-5 shrink-0 items-center justify-center text-secondary">{icon}</span>
            <Label.sm className={cn('flex-1 truncate', labelClassName)}>{label}</Label.sm>
        </button>
    )
}
