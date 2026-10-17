import { Card } from '@moc/ui/components/display/card'
import { Paragraph, Label } from '@moc/ui/components/display/text'
import { Toggle } from '@moc/ui/components/form/toggle'
import type { TelegramGroup, TelegramGroupTopic } from '@/data/fetch-telegram-groups'
import { TelegramTopicRow } from './telegram-topic-row'

type TelegramGroupCardProps = {
    group: TelegramGroup
    pendingChatId: string | null
    onOpenConnect: (group: TelegramGroup, threadId: number | null, topicName: string | null) => void
    onToggleGroup: (chatId: string, active: boolean) => void
}

export function TelegramGroupCard({ group, pendingChatId, onOpenConnect, onToggleGroup }: TelegramGroupCardProps) {
    function handleToggleGroup(active: boolean) {
        onToggleGroup(group.chatId, active)
    }

    function renderTopic(topic: TelegramGroupTopic) {
        return <TelegramTopicRow key={topic.threadId ?? 'general'} group={group} topic={topic} onOpenConnect={onOpenConnect} />
    }

    return (
        <Card>
            <Card.Header tight>
                <div className="flex flex-1 flex-col gap-1">
                    <Label.sm>{group.title || '(untitled)'}</Label.sm>
                    <Paragraph.xs className="text-tertiary">chat id {group.chatId}</Paragraph.xs>
                </div>
                <Toggle size="sm" aria-label={`${group.active ? 'Disable' : 'Enable'} notifications for ${group.title || 'this group'}`} checked={group.active} disabled={pendingChatId !== null} onChange={handleToggleGroup} />
            </Card.Header>
            {group.topics.length > 0 && <Card.Content className="divide-y divide-secondary">{group.topics.map(renderTopic)}</Card.Content>}
        </Card>
    )
}
