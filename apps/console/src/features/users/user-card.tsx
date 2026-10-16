import type { UserWithRole } from "@/data/fetch-users"
import { TelegramIcon } from "@moc/ui/components/display/telegram-icon"
import { Badge } from "@moc/ui/components/display/badge"
import { ListItemCard } from "@moc/ui/components/display/list-item-card"
import { UserAvatar } from "@moc/ui/components/display/user-avatar"
import type { Role } from "@moc/types/requests/assignee"
import { Shield } from "lucide-react"
import { UserRoleSelect } from "./user-role-select"
import { useUserMemberType } from '@/features/users/use-user-member-type'
import { ManagedOptionPicker } from '@moc/ui/components/form/managed-option-picker'

const roleColor: Record<string, "blue" | "purple" | "green" | "gray"> = {
  admin: "purple",
  editor: "blue",
  viewer: "green",
}

function getRoleColor(name: string | undefined) {
  return name ? roleColor[name.toLowerCase()] ?? "gray" : "gray"
}

type UserCardProps = {
  user: UserWithRole
  roles: Role[]
  canManage: boolean
  onRoleChange: (userId: string, roleId: string) => void
}

export function UserCard({ user, roles, canManage, onRoleChange }: UserCardProps) {
  const memberType = useUserMemberType(user)

  function handleMemberTypeChange(type: typeof memberType.meta.types[number] | null): void {
    if (type) void memberType.actions.change(type.id)
  }

  function getMemberTypeKey(type: typeof memberType.meta.types[number]): string {
    return type.id
  }

  function getMemberTypeLabel(type: typeof memberType.meta.types[number]): string {
    return type.name
  }

  return (
    <ListItemCard.Root className="flex-nowrap portrait:flex-wrap">
      <ListItemCard.Leading className="bg-transparent">
        <UserAvatar user={user} size="md" />
      </ListItemCard.Leading>
      <ListItemCard.Content>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <ListItemCard.Title>{user.name} {user.surname}</ListItemCard.Title>
          <Badge label={user.telegramChatId ? "Linked" : "Not linked"} color="gray" className={user.telegramChatId ? "[&_svg]:size-3 bg-[#229ED9]/10 text-[#229ED9]" : "[&_svg]:size-3"} icon={<TelegramIcon />} />
        </div>
        <ListItemCard.Subtitle>{user.email}</ListItemCard.Subtitle>

      </ListItemCard.Content>
      <ListItemCard.Trailing className="ml-0 w-auto justify-end portrait:ml-13 portrait:w-[calc(100%-3.25rem)] portrait:justify-start">
        {canManage
          ? <UserRoleSelect userId={user.id} role={user.role} roles={roles} onChange={onRoleChange} />
          : <Badge label={user.role?.name ?? "No role"} color={getRoleColor(user.role?.name)} icon={<Shield />} />
        }
        {memberType.meta.canEdit
          ? <ManagedOptionPicker.Root key={memberType.meta.workspaceId} options={memberType.meta.types} value={memberType.meta.selected?.id ?? null} onValueChange={handleMemberTypeChange} getOptionKey={getMemberTypeKey} getOptionLabel={getMemberTypeLabel} onCreate={memberType.actions.create} onRename={memberType.actions.rename} label={`Member type for ${user.name}`} placeholder="Choose member type">
              <ManagedOptionPicker.Field className="w-48 capitalize" />
              <ManagedOptionPicker.Content />
            </ManagedOptionPicker.Root>
          : <Badge label={memberType.meta.name} color="gray" />
        }
      </ListItemCard.Trailing>
    </ListItemCard.Root>
  )
}
