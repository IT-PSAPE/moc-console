import { Button } from '@moc/ui/components/controls/button'
import { ListItemCard } from '@moc/ui/components/display/list-item-card'
import { UserAvatar } from '@moc/ui/components/display/user-avatar'
import { TelegramLinkedBadge } from '@/features/users/telegram-linked-badge'
import type { UserWithRole } from '@/data/fetch-users'
import { Link2 } from 'lucide-react'

type MemberDestinationRowProps = { user: UserWithRole; onOpenConnect: (user: UserWithRole) => void }

export function MemberDestinationRow({ user, onOpenConnect }: MemberDestinationRowProps) {
  function handleOpenConnect() {
    onOpenConnect(user)
  }

  return (
    <ListItemCard.Root>
      <ListItemCard.Leading className="bg-transparent"><UserAvatar user={user} size="sm" /></ListItemCard.Leading>
      <ListItemCard.Content>
        <ListItemCard.Title>{user.name} {user.surname}</ListItemCard.Title>
        <ListItemCard.Subtitle>{user.email}</ListItemCard.Subtitle>
      </ListItemCard.Content>
      <ListItemCard.Trailing>
        <TelegramLinkedBadge linked />
        <Button.Icon size="sm" variant="ghost" icon={<Link2 />} onClick={handleOpenConnect} aria-label={`Connect events to ${user.name} ${user.surname}`} />
      </ListItemCard.Trailing>
    </ListItemCard.Root>
  )
}
