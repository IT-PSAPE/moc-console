import { Indicator } from "@moc/ui/components/display/indicator";
import { KanbanBoard } from "@moc/ui/components/display/kanban-board";
import { Label } from "@moc/ui/components/display/text";
import type { Equipment } from "@moc/types/equipment";
import { equipmentStatusGroup } from "@moc/types/equipment/constants";
import { EquipmentItem } from "@/features/equipment/equipment-item";
import { DraggableEquipmentItem } from "./draggable-equipment-item";
import { useEquipmentKanbanStatusChange } from "./use-equipment-kanban-status-change";

export function InventoryKanbanView({ equipment }: { equipment: Equipment[] }) {
    const drag = useEquipmentKanbanStatusChange();

    return (
        <KanbanBoard onDragStart={drag.actions.handleDragStart} onDragEnd={drag.actions.handleDragEnd}>
            <KanbanBoard.Columns>
                {equipmentStatusGroup.map((group) => {
                    const items = equipment.filter((e) => e.status === group.key);
                    return (
                        <KanbanBoard.Column key={group.key} id={group.key}>
                            <KanbanBoard.ColumnHeader>
                                <Indicator color={group.color} className="size-6" />
                                <Label.sm>{group.label}</Label.sm>
                            </KanbanBoard.ColumnHeader>
                            <KanbanBoard.ColumnContent>
                                {items.map((e) => (
                                    <DraggableEquipmentItem key={e.id} equipment={e} />
                                ))}
                            </KanbanBoard.ColumnContent>
                        </KanbanBoard.Column>
                    );
                })}
            </KanbanBoard.Columns>

            <KanbanBoard.Overlay>
                {drag.state.activeItem && <EquipmentItem equipment={drag.state.activeItem} />}
            </KanbanBoard.Overlay>
        </KanbanBoard>
    );
}
