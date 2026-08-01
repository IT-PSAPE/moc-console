import { Badge } from "@moc/ui/components/display/badge"
import { DataTable, type DataTableColumn } from "@moc/ui/components/display/data-table"
import { UserAvatar } from "@moc/ui/components/display/user-avatar"
import type { UserWithRole } from "@/data/fetch-users"
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

type UsersTableProps = {
  users: UserWithRole[]
  roles: Role[]
  currentUserId?: string
  canManage: boolean
  onRoleChange: (userId: string, roleId: string) => void
}

export function UsersTable({ users, roles, currentUserId, canManage, onRoleChange }: UsersTableProps) {
  const columns: DataTableColumn<UserWithRole>[] = [
    {
      key: "name",
      header: "Name",
      render: (_, user) => (
        <span className="flex items-center gap-3">
          <UserAvatar user={user} size="sm" />
          <span className="flex items-center gap-2 text-primary">
            {user.name} {user.surname}
            {user.id === currentUserId && <Badge label="You" color="blue" />}
          </span>
        </span>
      ),
    },
    { key: "email", header: "Email", render: (_, user) => <span className="text-tertiary">{user.email}</span> },
    {
      key: "role",
      header: "Role",
      render: (_, user) => canManage
        ? <UserRoleSelect userId={user.id} role={user.role} roles={roles} onChange={onRoleChange} />
        : <Badge label={user.role?.name ?? "No role"} color={getRoleColor(user.role?.name)} icon={<Shield />} />,
    },
    {
      key: "telegramChatId",
      header: "Telegram",
      render: (_, user) => user.telegramChatId
        ? <Badge label="Connected" color="green" icon={<MessagesSquare />} />
        : <Badge label="Not connected" color="gray" variant="outline" />,
    },
  ]

  return <DataTable data={users} columns={columns} emptyMessage="No members match your search" />
}
