import { ItemActionsMenu } from "@moc/ui/components/controls/item-actions-menu"
import { Badge } from "@moc/ui/components/display/badge"
import { ListItemCard } from "@moc/ui/components/display/list-item-card"
import { Toggle } from "@moc/ui/components/form/toggle"
import type { Venue } from "@moc/types/venues"

type VenueRowProps = {
    venue: Venue
    pending: boolean
    onEdit: (venue: Venue) => void
    onToggleActive: (venue: Venue, active: boolean) => void
    onDuplicate: (venue: Venue) => void
    onDelete: (venue: Venue) => void
}

export function VenueRow({ venue, pending, onEdit, onToggleActive, onDelete, onDuplicate }: VenueRowProps) {
    function handleEdit() {
        onEdit(venue)
    }

    function handleToggle(active: boolean) {
        onToggleActive(venue, active)
    }

    function handleDuplicate(): void {
        onDuplicate(venue)
    }

    function handleDelete() {
        onDelete(venue)
    }

    return (
        <ListItemCard.Root>
            <ListItemCard.Content>
                <div className="flex min-w-0 items-center gap-2">
                    <ListItemCard.Title>{venue.name}</ListItemCard.Title>
                    {!venue.active && <Badge label="Inactive" color="gray" />}
                </div>
                {venue.description && <ListItemCard.Subtitle>{venue.description}</ListItemCard.Subtitle>}
            </ListItemCard.Content>
            <ListItemCard.Trailing>
                <Toggle aria-label={`${venue.active ? "Deactivate" : "Activate"} ${venue.name}`} checked={venue.active} disabled={pending} onChange={handleToggle} />
                <ItemActionsMenu label={venue.name} disabled={pending} onEdit={handleEdit} onDuplicate={handleDuplicate} onDelete={handleDelete} />
            </ListItemCard.Trailing>
        </ListItemCard.Root>
        )
}
