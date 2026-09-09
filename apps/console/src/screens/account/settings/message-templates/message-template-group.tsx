import type { MessageType } from "@moc/notifications"
import { Card } from "@moc/ui/components/display/card"
import { Label } from "@moc/ui/components/display/text"
import { MessageTemplateRow } from "./message-template-row"

type MessageTemplateGroupProps = {
    title: string
    types: readonly MessageType[]
    customised: Set<MessageType>
}

export function MessageTemplateGroup({ title, types, customised }: MessageTemplateGroupProps) {
    function renderTemplate(type: MessageType) {
        return <MessageTemplateRow key={type} type={type} customised={customised.has(type)} />
    }

    return (
        <Card>
            <Card.Header tight>
                <Label.md>{title}</Label.md>
            </Card.Header>
            <Card.Content className="flex flex-col overflow-hidden">
                {types.map(renderTemplate)}
            </Card.Content>
        </Card>
    )
}
