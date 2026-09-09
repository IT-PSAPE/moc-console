import type { PendingWorkspaceUser } from "@/data/fetch-users"
import { Button } from "@moc/ui/components/controls/button"
import { Badge } from "@moc/ui/components/display/badge"
import { Card } from "@moc/ui/components/display/card"
import { ListItemCard } from "@moc/ui/components/display/list-item-card"
import { UserAvatar } from "@moc/ui/components/display/user-avatar"

type PendingUserCardProps = {
  user: PendingWorkspaceUser
  onApprove: (requestId: string) => void
}

export function PendingUserCard({ user, onApprove }: PendingUserCardProps) {
  function approve() {
    onApprove(user.requestId)
  }

  return (
    <Card.Content>
      <ListItemCard.Root className="flex-wrap sm:flex-nowrap">
        <ListItemCard.Leading className="bg-transparent">
          <UserAvatar user={user} size="md" />
        </ListItemCard.Leading>
        <ListItemCard.Content>
          <div className="flex min-w-0 items-center gap-2">
            <ListItemCard.Title>{user.name} {user.surname}</ListItemCard.Title>
            <Badge label="Pending" color="gray" />
          </div>
          <ListItemCard.Subtitle>{user.email}</ListItemCard.Subtitle>
        </ListItemCard.Content>
        <ListItemCard.Trailing className="ml-13 w-[calc(100%-3.25rem)] justify-start sm:ml-0 sm:w-auto sm:justify-end">
          <Button className="min-h-9 px-3 py-1.5" onClick={approve}>Accept</Button>
        </ListItemCard.Trailing>
      </ListItemCard.Root>
    </Card.Content>
  )
}
