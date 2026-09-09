import type { UserWithRole } from "@/data/fetch-users"
import { Badge } from "@moc/ui/components/display/badge"
import { Card } from "@moc/ui/components/display/card"
import { ListItemCard } from "@moc/ui/components/display/list-item-card"
import { UserAvatar } from "@moc/ui/components/display/user-avatar"
import type { Role } from "@moc/types/requests/assignee"
import { MessagesSquare, Shield } from "lucide-react"
import { UserRoleSelect } from "./user-role-select"

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
  currentUserId?: string
  canManage: boolean
  onRoleChange: (userId: string, roleId: string) => void
}

export function UserCard({ user, roles, currentUserId, canManage, onRoleChange }: UserCardProps) {
  return (
    <Card.Content>
      <ListItemCard.Root className="flex-wrap sm:flex-nowrap">
        <ListItemCard.Leading className="bg-transparent">
          <UserAvatar user={user} size="md" />
        </ListItemCard.Leading>
        <ListItemCard.Content>
          <div className="flex min-w-0 items-center gap-2">
            <ListItemCard.Title>{user.name} {user.surname}</ListItemCard.Title>
            {user.id === currentUserId && <Badge label="You" color="blue" />}
          </div>
          <ListItemCard.Subtitle>{user.email}</ListItemCard.Subtitle>
          <ListItemCard.Meta>
            <ListItemCard.MetaItem icon={<Shield />}>{user.role?.name ?? "No role"}</ListItemCard.MetaItem>
            <ListItemCard.MetaItem className={user.telegramChatId ? "text-success" : undefined} icon={<MessagesSquare />}>
              Telegram {user.telegramChatId ? "connected" : "not connected"}
            </ListItemCard.MetaItem>
          </ListItemCard.Meta>
        </ListItemCard.Content>
        <ListItemCard.Trailing className="ml-13 w-[calc(100%-3.25rem)] justify-start sm:ml-0 sm:w-auto sm:justify-end">
          {canManage
            ? <UserRoleSelect userId={user.id} role={user.role} roles={roles} onChange={onRoleChange} />
            : <Badge label={user.role?.name ?? "No role"} color={getRoleColor(user.role?.name)} icon={<Shield />} />}
        </ListItemCard.Trailing>
      </ListItemCard.Root>
    </Card.Content>
  )
}
