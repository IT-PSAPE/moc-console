import { Badge } from '@moc/ui/components/display/badge'
import { Button } from '@moc/ui/components/controls/button'
import { Card } from '@moc/ui/components/display/card'
import { ListItemCard } from '@moc/ui/components/display/list-item-card'
import { UserAvatar } from '@moc/ui/components/display/user-avatar'
import { Link2 } from 'lucide-react'
import type { UserWithRole } from '@/data/fetch-users'

type TelegramUserRowProps = {
    user: UserWithRole
    onOpenConnect: (user: UserWithRole) => void
}

export function TelegramUserRow({ user, onOpenConnect }: TelegramUserRowProps) {
    const isLinked = user.telegramChatId !== null

    function handleOpenConnect() {
        onOpenConnect(user)
    }

    return (
        <Card.Content>
            <ListItemCard.Root>
                <ListItemCard.Leading className="bg-transparent">
                    <UserAvatar user={user} size="md" />
                </ListItemCard.Leading>
                <ListItemCard.Content>
                    <ListItemCard.Title>{user.name} {user.surname}</ListItemCard.Title>
                    <ListItemCard.Subtitle>{isLinked ? user.email : "Telegram isn't linked"}</ListItemCard.Subtitle>
                </ListItemCard.Content>
                <ListItemCard.Trailing>
                    {!isLinked && <Badge label="Not linked" color="gray" />}
                    <Button.Icon
                        variant="ghost"
                        icon={<Link2 />}
                        disabled={!isLinked}
                        onClick={handleOpenConnect}
                        aria-label={`Connect events to ${user.name} ${user.surname}`}
                    />
                </ListItemCard.Trailing>
            </ListItemCard.Root>
        </Card.Content>
    )
}
