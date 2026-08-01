import type { NotificationEventDefinition, NotificationEventKey } from '@moc/notifications'
import { SettingsRow } from '@moc/ui/components/display/settings-row'
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
        <SettingsRow label={event.label}>
            <Toggle checked={connected} disabled={disabled} onChange={handleChange} />
        </SettingsRow>
    )
}
