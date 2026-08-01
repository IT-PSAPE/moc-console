import { Card } from '@moc/ui/components/display/card'
import { Paragraph, Label } from '@moc/ui/components/display/text'
import { Toggle } from '@moc/ui/components/form/toggle'
import { Button } from '@moc/ui/components/controls/button'
import { Link2 } from 'lucide-react'
import type { TelegramGroup, TelegramGroupTopic } from '@/data/fetch-telegram-groups'
import { TelegramTopicRow } from './telegram-topic-row'

type TelegramGroupCardProps = {
    group: TelegramGroup
    pendingChatId: string | null
    onOpenConnect: (group: TelegramGroup, threadId: number | null, topicName: string | null) => void
    onToggleGroup: (chatId: string, active: boolean) => void
}

export function TelegramGroupCard({ group, pendingChatId, onOpenConnect, onToggleGroup }: TelegramGroupCardProps) {
    function handleOpenConnect() {
        onOpenConnect(group, null, null)
    }

    function handleToggleGroup(active: boolean) {
        onToggleGroup(group.chatId, active)
    }

    function renderTopic(topic: TelegramGroupTopic) {
        return <TelegramTopicRow key={topic.threadId} group={group} topic={topic} onOpenConnect={onOpenConnect} />
    }

    return (
        <Card>
            <Card.Header tight>
                <div className="flex flex-1 flex-col gap-1">
                    <Label.md>{group.title || '(untitled)'}</Label.md>
                    <Paragraph.xs className="text-quaternary">chat id {group.chatId}</Paragraph.xs>
                </div>
                <div className="flex items-center gap-3">
                    <Button.Icon
                        variant="ghost"
                        icon={<Link2 />}
                        disabled={!group.active}
                        onClick={handleOpenConnect}
                        aria-label={`Connect events to ${group.title || 'this group'}`}
                    />
                    <Toggle checked={group.active} disabled={pendingChatId === group.chatId} onChange={handleToggleGroup} />
                </div>
            </Card.Header>
            {group.topics.length > 0 && <Card.Content className="flex flex-col">{group.topics.map(renderTopic)}</Card.Content>}
        </Card>
    )
}
