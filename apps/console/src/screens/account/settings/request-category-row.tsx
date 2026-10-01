import { ItemActionsMenu } from "@moc/ui/components/controls/item-actions-menu"
import { Badge } from "@moc/ui/components/display/badge"
import { ListItemCard } from "@moc/ui/components/display/list-item-card"
import { Toggle } from "@moc/ui/components/form/toggle"
import type { RequestCategoryDefinition } from "@moc/types/requests"

type RequestCategoryRowProps = {
    category: RequestCategoryDefinition
    pending: boolean
    onEdit: (category: RequestCategoryDefinition) => void
    onToggleActive: (category: RequestCategoryDefinition, active: boolean) => void
    onDuplicate: (category: RequestCategoryDefinition) => void
    onDelete: (category: RequestCategoryDefinition) => void
}

export function RequestCategoryRow({ category, pending, onEdit, onToggleActive, onDelete, onDuplicate }: RequestCategoryRowProps) {
    function handleEdit() {
        onEdit(category)
    }

    function handleToggle(active: boolean) {
        onToggleActive(category, active)
    }

    function handleDuplicate(): void {
        onDuplicate(category)
    }

    function handleDelete() {
        onDelete(category)
    }

    return (
        <ListItemCard.Root>
            <ListItemCard.Content>
                <div className="flex min-w-0 items-center gap-2">
                    <ListItemCard.Title>{category.name}</ListItemCard.Title>
                    {!category.active && <Badge label="Inactive" color="gray" />}
                </div>
                {category.description && <ListItemCard.Subtitle>{category.description}</ListItemCard.Subtitle>}
            </ListItemCard.Content>
            <ListItemCard.Trailing>
                <Toggle aria-label={`${category.active ? "Deactivate" : "Activate"} ${category.name}`} checked={category.active} disabled={pending} onChange={handleToggle} />
                <ItemActionsMenu label={category.name} disabled={pending} onEdit={handleEdit} onDuplicate={handleDuplicate} onDelete={handleDelete} />
            </ListItemCard.Trailing>
        </ListItemCard.Root>
        )
}
