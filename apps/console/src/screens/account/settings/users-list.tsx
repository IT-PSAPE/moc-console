import type { UserWithRole } from "@/data/fetch-users"
import { Card } from "@moc/ui/components/display/card"
import { EmptyState } from "@moc/ui/components/feedback/empty-state"
import type { Role } from "@moc/types/requests/assignee"
import { Users } from "lucide-react"
import { UserCard } from "./user-card"

type UsersListProps = {
  users: UserWithRole[]
  roles: Role[]
  currentUserId?: string
  canManage: boolean
  onRoleChange: (userId: string, roleId: string) => void
}

export function UsersList({ users, roles, currentUserId, canManage, onRoleChange }: UsersListProps) {
  function renderUser(user: UserWithRole) {
    return <UserCard key={user.id} user={user} roles={roles} currentUserId={currentUserId} canManage={canManage} onRoleChange={onRoleChange} />
  }

  if (users.length === 0) {
    return <EmptyState icon={<Users />} title="No members yet" description="Members added to this workspace will appear here." />
  }

  return <Card>{users.map(renderUser)}</Card>
}
