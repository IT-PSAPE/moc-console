import { Button } from '@moc/ui/components/controls/button'
import { Badge } from '@moc/ui/components/display/badge'
import { ListItemCard } from '@moc/ui/components/display/list-item-card'
import { TelegramIcon } from '@moc/ui/components/display/telegram-icon'
import { UserAvatar } from '@moc/ui/components/display/user-avatar'
import type { UserWithRole } from '@/data/fetch-users'
import { Link2 } from 'lucide-react'

type MemberDestinationRowProps = { user: UserWithRole; onOpenConnect: (user: UserWithRole) => void }

export function MemberDestinationRow({ user, onOpenConnect }: MemberDestinationRowProps) {
  function handleOpenConnect() {
    onOpenConnect(user)
  }

  return (
    <ListItemCard.Root>
      <ListItemCard.Leading className="bg-transparent"><UserAvatar user={user} size="md" /></ListItemCard.Leading>
      <ListItemCard.Content>
        <ListItemCard.Title>{user.name} {user.surname}</ListItemCard.Title>
        <ListItemCard.Subtitle>{user.email}</ListItemCard.Subtitle>
      </ListItemCard.Content>
      <ListItemCard.Trailing className="ml-0 w-auto justify-end portrait:ml-13 portrait:w-[calc(100%-3.25rem)] portrait:justify-start">
        <Badge label="Linked" color="gray" className="[&_svg]:size-3 bg-[#229ED9]/10 text-[#229ED9]" icon={<TelegramIcon />} />
        <Button.Icon variant="ghost" icon={<Link2 />} onClick={handleOpenConnect} aria-label={`Connect events to ${user.name} ${user.surname}`} />
      </ListItemCard.Trailing>
    </ListItemCard.Root>
  )
}
