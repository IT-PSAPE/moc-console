import { Badge } from "@moc/ui/components/display/badge"
import { Button } from "@moc/ui/components/controls/button"
import { Card } from "@moc/ui/components/display/card"
import { ListItemCard } from "@moc/ui/components/display/list-item-card"
import { Toggle } from "@moc/ui/components/form/toggle"
import { CalendarHeart, Pencil, Trash2 } from "lucide-react"
import type { VenueEvent } from "@moc/types/venues"

type VenueEventRowProps = {
    event: VenueEvent
    pending: boolean
    onEdit: (event: VenueEvent) => void
    onToggleActive: (event: VenueEvent, active: boolean) => void
    onDelete: (event: VenueEvent) => void
}

export function VenueEventRow({ event, pending, onEdit, onToggleActive, onDelete }: VenueEventRowProps) {
    function handleEdit() {
        onEdit(event)
    }

    function handleToggle(active: boolean) {
        onToggleActive(event, active)
    }

    function handleDelete() {
        onDelete(event)
    }

    return (
        <Card.Content>
            <ListItemCard.Root>
                <ListItemCard.Leading>
                    <CalendarHeart className="size-4" />
                </ListItemCard.Leading>
                <ListItemCard.Content>
                    <div className="flex min-w-0 items-center gap-2">
                        <ListItemCard.Title>{event.name}</ListItemCard.Title>
                        {!event.active && <Badge label="Inactive" color="gray" />}
                    </div>
                    {event.description && <ListItemCard.Subtitle>{event.description}</ListItemCard.Subtitle>}
                </ListItemCard.Content>
                <ListItemCard.Trailing>
                    <Toggle aria-label={`${event.active ? "Deactivate" : "Activate"} ${event.name}`} checked={event.active} disabled={pending} onChange={handleToggle} />
                    <Button.Icon variant="ghost" icon={<Pencil />} onClick={handleEdit} aria-label={`Edit ${event.name}`} />
                    <Button.Icon variant="ghost" icon={<Trash2 />} onClick={handleDelete} aria-label={`Delete ${event.name}`} />
                </ListItemCard.Trailing>
            </ListItemCard.Root>
        </Card.Content>
    )
}
