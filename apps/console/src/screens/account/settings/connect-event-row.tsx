import type { NotificationEventDefinition, NotificationEventKey } from '@moc/notifications'
import { ListItemCard } from '@moc/ui/components/display/list-item-card'
import { Toggle } from '@moc/ui/components/form/toggle'

type ConnectEventRowProps = {
    event: NotificationEventDefinition
    connected: boolean
    disabled: boolean
    onToggle: (key: NotificationEventKey, connected: boolean) => void
}

export function ConnectEventRow({ event, connected, disabled, onToggle }: ConnectEventRowProps) {
    function handleChange(nextConnected: boolean) {
        onToggle(event.key, nextConnected)
    }

    return (
        <ListItemCard.Root className="items-start gap-3 px-0 py-3 md:px-0">
            <ListItemCard.Leading className="h-auto w-auto overflow-visible bg-transparent pt-0.5">
                <Toggle aria-label={`${connected ? 'Disconnect' : 'Connect'} ${event.label}`} checked={connected} disabled={disabled} onChange={handleChange} />
            </ListItemCard.Leading>
            <ListItemCard.Content>
                <ListItemCard.Title>{event.label}</ListItemCard.Title>
                <ListItemCard.Subtitle className="whitespace-normal">{event.description}</ListItemCard.Subtitle>
            </ListItemCard.Content>
        </ListItemCard.Root>
    )
}
