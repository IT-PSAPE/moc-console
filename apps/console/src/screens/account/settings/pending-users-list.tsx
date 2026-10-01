import type { PendingWorkspaceUser } from "@/data/fetch-users"
import { DividedList } from "@moc/ui/components/display/divided-list"
import { PendingUserCard } from "./pending-user-card"

type PendingUsersListProps = {
  users: PendingWorkspaceUser[]
  onApprove: (requestId: string) => void
  onReject: (requestId: string) => void
}

export function PendingUsersList({ users, onApprove, onReject }: PendingUsersListProps) {
  function renderUser(user: PendingWorkspaceUser) {
    return <PendingUserCard key={user.requestId} user={user} onApprove={onApprove} onReject={onReject} />
  }

  if (users.length === 0) return null
  return <DividedList>{users.map(renderUser)}</DividedList>
}
