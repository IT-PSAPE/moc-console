import type { PendingWorkspaceUser } from "@/data/fetch-users"
import { Card } from "@moc/ui/components/display/card"
import { PendingUserCard } from "./pending-user-card"

type PendingUsersListProps = {
  users: PendingWorkspaceUser[]
  onApprove: (requestId: string) => void
}

export function PendingUsersList({ users, onApprove }: PendingUsersListProps) {
  function renderUser(user: PendingWorkspaceUser) {
    return <PendingUserCard key={user.requestId} user={user} onApprove={onApprove} />
  }

  if (users.length === 0) return null
  return <Card>{users.map(renderUser)}</Card>
}
