import { Badge } from '@moc/ui/components/display/badge'
import { Button } from '@moc/ui/components/controls/button'
import { Label, Paragraph } from '@moc/ui/components/display/text'
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
        <div className="flex items-center justify-between border-b border-tertiary px-3 py-2 last:border-b-0">
            <div className="flex items-center gap-2">
                <Label.sm>{topic.name || '(unnamed)'}</Label.sm>
                <Paragraph.xs className="text-quaternary">#{topic.threadId}</Paragraph.xs>
                {topic.closed && <Badge label="closed" color="gray" variant="outline" />}
            </div>
            <Button.Icon
                variant="ghost"
                icon={<Link2 />}
                disabled={!group.active || topic.closed}
                onClick={handleOpenConnect}
                aria-label={`Connect events to ${topic.name || `topic ${topic.threadId}`}`}
            />
        </div>
    )
}
