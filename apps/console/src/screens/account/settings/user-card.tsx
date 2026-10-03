import { Button } from "@moc/ui/components/controls/button"
import { useMemberNotifications } from "./member-notification-context"
import type { UserWithRole } from "@/data/fetch-users"
import { TelegramIcon } from "@moc/ui/components/display/telegram-icon"
import { Badge } from "@moc/ui/components/display/badge"
import { ListItemCard } from "@moc/ui/components/display/list-item-card"
import { UserAvatar } from "@moc/ui/components/display/user-avatar"
import type { Role } from "@moc/types/requests/assignee"
import { Link2, Shield } from "lucide-react"
import { UserRoleSelect } from "./user-role-select"
import { useUserMemberType } from '@/features/users/use-user-member-type'
import { SelectField } from '@moc/ui/components/form/select-field'

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
  const { actions } = useMemberNotifications()
  const memberType = useUserMemberType(user)

  function handleOpenConnect(): void {
    actions.openConnectUser(user)
  }

  return (
    <ListItemCard.Root className="flex-wrap sm:flex-nowrap">
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
      <ListItemCard.Trailing className="ml-13 w-[calc(100%-3.25rem)] justify-start sm:ml-0 sm:w-auto sm:justify-end">
        {memberType.meta.canEdit ? <SelectField name={`type-${user.id}`} label={`Member type for ${user.name}`} value={user.memberTypeId} items={memberType.meta.items} onValueChange={memberType.actions.change} /> : <Badge label={memberType.meta.name} color="gray" />}
        {canManage && user.telegramChatId && <Button.Icon variant="ghost" icon={<Link2 />} onClick={handleOpenConnect} aria-label={`Connect events to ${user.name} ${user.surname}`} />}
        {canManage
          ? <UserRoleSelect userId={user.id} role={user.role} roles={roles} onChange={onRoleChange} />
          : <Badge label={user.role?.name ?? "No role"} color={getRoleColor(user.role?.name)} icon={<Shield />} />}
      </ListItemCard.Trailing>
    </ListItemCard.Root>
  )
}
