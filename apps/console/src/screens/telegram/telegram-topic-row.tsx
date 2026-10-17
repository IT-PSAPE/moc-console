import { Badge } from '@moc/ui/components/display/badge'
import { Button } from '@moc/ui/components/controls/button'
import { Paragraph } from '@moc/ui/components/display/text'
import { ListItemCard } from '@moc/ui/components/display/list-item-card'
import { Link2 } from 'lucide-react'
import type { TelegramGroup, TelegramGroupTopic } from '@/data/fetch-telegram-groups'

type TelegramTopicRowProps = {
    group: TelegramGroup
    topic: TelegramGroupTopic
    onOpenConnect: (group: TelegramGroup, threadId: number | null, topicName: string | null) => void
}

export function TelegramTopicRow({ group, topic, onOpenConnect }: TelegramTopicRowProps) {
    function handleOpenConnect() {
        onOpenConnect(group, topic.threadId, topic.name || null)
    }

    return (
        <ListItemCard.Root className="flex-nowrap py-3">
            <ListItemCard.Content className="flex-row flex-wrap items-center justify-start gap-2">
                <ListItemCard.Title className="whitespace-normal break-words">{topic.name || '(unnamed)'}</ListItemCard.Title>
                {topic.threadId !== null && <Paragraph.xs className="text-quaternary">#{topic.threadId}</Paragraph.xs>}
                {topic.closed && <Badge label="closed" color="gray" variant="outline" />}
            </ListItemCard.Content>
            <Button.Icon
                size="sm"
                variant="ghost"
                icon={<Link2 />}
                disabled={!group.active || topic.closed}
                onClick={handleOpenConnect}
                aria-label={`Connect events to ${topic.name || `topic ${topic.threadId}`}`}
            />
        </ListItemCard.Root>
    )
}
