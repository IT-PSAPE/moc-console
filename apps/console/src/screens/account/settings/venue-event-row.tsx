import { ItemActionsMenu } from "@moc/ui/components/controls/item-actions-menu"
import { Badge } from "@moc/ui/components/display/badge"
import { ListItemCard } from "@moc/ui/components/display/list-item-card"
import { Toggle } from "@moc/ui/components/form/toggle"
import type { VenueEvent } from "@moc/types/venues"

type VenueEventRowProps = {
    event: VenueEvent
    pending: boolean
    onEdit: (event: VenueEvent) => void
    onToggleActive: (event: VenueEvent, active: boolean) => void
    onDuplicate: (event: VenueEvent) => void
    onDelete: (event: VenueEvent) => void
}

export function VenueEventRow({ event, pending, onEdit, onToggleActive, onDelete, onDuplicate }: VenueEventRowProps) {
    function handleEdit() {
        onEdit(event)
    }

    function handleToggle(active: boolean) {
        onToggleActive(event, active)
    }

    function handleDuplicate(): void {
        onDuplicate(event)
    }

    function handleDelete() {
        onDelete(event)
    }

    return (
        <ListItemCard.Root>
            <ListItemCard.Content>
                <div className="flex min-w-0 items-center gap-2">
                    <ListItemCard.Title>{event.name}</ListItemCard.Title>
                    {!event.active && <Badge label="Inactive" color="gray" />}
                </div>
                {event.description && <ListItemCard.Subtitle>{event.description}</ListItemCard.Subtitle>}
            </ListItemCard.Content>
            <ListItemCard.Trailing>
                <Toggle aria-label={`${event.active ? "Deactivate" : "Activate"} ${event.name}`} checked={event.active} disabled={pending} onChange={handleToggle} />
                <ItemActionsMenu label={event.name} disabled={pending} onEdit={handleEdit} onDuplicate={handleDuplicate} onDelete={handleDelete} />
            </ListItemCard.Trailing>
        </ListItemCard.Root>
        )
}
