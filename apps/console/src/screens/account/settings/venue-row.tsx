import { Badge } from "@moc/ui/components/display/badge"
import { Button } from "@moc/ui/components/controls/button"
import { Card } from "@moc/ui/components/display/card"
import { ListItemCard } from "@moc/ui/components/display/list-item-card"
import { Toggle } from "@moc/ui/components/form/toggle"
import { Building2, Pencil, Trash2, Users } from "lucide-react"
import type { Venue } from "@moc/types/venues"

type VenueRowProps = {
    venue: Venue
    pending: boolean
    onEdit: (venue: Venue) => void
    onToggleActive: (venue: Venue, active: boolean) => void
    onDelete: (venue: Venue) => void
}

export function VenueRow({ venue, pending, onEdit, onToggleActive, onDelete }: VenueRowProps) {
    function handleEdit() {
        onEdit(venue)
    }

    function handleToggle(active: boolean) {
        onToggleActive(venue, active)
    }

    function handleDelete() {
        onDelete(venue)
    }

    return (
        <Card.Content>
            <ListItemCard.Root>
                <ListItemCard.Leading>
                    <Building2 className="size-4" />
                </ListItemCard.Leading>
                <ListItemCard.Content>
                    <div className="flex min-w-0 items-center gap-2">
                        <ListItemCard.Title>{venue.name}</ListItemCard.Title>
                        {!venue.active && <Badge label="Inactive" color="gray" />}
                    </div>
                    {venue.location && <ListItemCard.Subtitle>{venue.location}</ListItemCard.Subtitle>}
                    {venue.capacity !== null && (
                        <ListItemCard.Meta>
                            <ListItemCard.MetaItem icon={<Users />}>{venue.capacity} capacity</ListItemCard.MetaItem>
                        </ListItemCard.Meta>
                    )}
                </ListItemCard.Content>
                <ListItemCard.Trailing>
                    <Toggle aria-label={`${venue.active ? "Deactivate" : "Activate"} ${venue.name}`} checked={venue.active} disabled={pending} onChange={handleToggle} />
                    <Button.Icon variant="ghost" icon={<Pencil />} onClick={handleEdit} aria-label={`Edit ${venue.name}`} />
                    <Button.Icon variant="ghost" icon={<Trash2 />} onClick={handleDelete} aria-label={`Delete ${venue.name}`} />
                </ListItemCard.Trailing>
            </ListItemCard.Root>
        </Card.Content>
    )
}
