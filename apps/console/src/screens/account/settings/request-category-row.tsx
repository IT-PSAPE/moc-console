import { Badge } from "@moc/ui/components/display/badge"
import { Button } from "@moc/ui/components/controls/button"
import { Card } from "@moc/ui/components/display/card"
import { ListItemCard } from "@moc/ui/components/display/list-item-card"
import { Toggle } from "@moc/ui/components/form/toggle"
import { ListTree, Pencil, Trash2 } from "lucide-react"
import type { RequestCategoryDefinition } from "@moc/types/requests"

type RequestCategoryRowProps = {
    category: RequestCategoryDefinition
    pending: boolean
    onEdit: (category: RequestCategoryDefinition) => void
    onToggleActive: (category: RequestCategoryDefinition, active: boolean) => void
    onDelete: (category: RequestCategoryDefinition) => void
}

export function RequestCategoryRow({ category, pending, onEdit, onToggleActive, onDelete }: RequestCategoryRowProps) {
    function handleEdit() {
        onEdit(category)
    }

    function handleToggle(active: boolean) {
        onToggleActive(category, active)
    }

    function handleDelete() {
        onDelete(category)
    }

    return (
        <Card.Content>
            <ListItemCard.Root>
                <ListItemCard.Leading>
                    <ListTree className="size-4" />
                </ListItemCard.Leading>
                <ListItemCard.Content>
                    <div className="flex min-w-0 items-center gap-2">
                        <ListItemCard.Title>{category.name}</ListItemCard.Title>
                        {!category.active && <Badge label="Inactive" color="gray" />}
                    </div>
                </ListItemCard.Content>
                <ListItemCard.Trailing>
                    <Toggle aria-label={`${category.active ? "Deactivate" : "Activate"} ${category.name}`} checked={category.active} disabled={pending} onChange={handleToggle} />
                    <Button.Icon variant="ghost" icon={<Pencil />} onClick={handleEdit} aria-label={`Edit ${category.name}`} />
                    <Button.Icon variant="ghost" icon={<Trash2 />} onClick={handleDelete} aria-label={`Delete ${category.name}`} />
                </ListItemCard.Trailing>
            </ListItemCard.Root>
        </Card.Content>
    )
}
