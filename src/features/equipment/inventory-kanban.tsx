import { Indicator } from "@/components/display/indicator";
import { KanbanBoard } from "@/components/display/kanban-board";
import { Label } from "@/components/display/text";
import type { Equipment, EquipmentStatus } from "@/types/equipment";
import { equipmentStatusGroup } from "@/types/equipment/constants";
import { updateEquipmentStatus } from "@/data/mutate-equipment";
import { useFeedback } from "@/components/feedback/feedback-provider";
import { type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { useState } from "react";
import { getErrorMessage } from "@/utils/get-error-message";
import { EquipmentItem } from "@/features/equipment/equipment-item";
import { useEquipment } from "@/features/equipment/equipment-provider";

function DraggableEquipmentItem({ equipment }: { equipment: Equipment }) {
    const [drawerOpen, setDrawerOpen] = useState(false);
    return (
        <KanbanBoard.Item id={equipment.id} data={{ equipment }} disabled={drawerOpen}>
            <EquipmentItem equipment={equipment} onDrawerOpenChange={setDrawerOpen} />
        </KanbanBoard.Item>
    );
}

export function InventoryKanban({ equipment }: { equipment: Equipment[] }) {
    const { actions: { syncEquipment } } = useEquipment();
    const { toast } = useFeedback();
    const [activeEquipment, setActiveEquipment] = useState<Equipment | null>(null);

    function handleDragStart(event: DragStartEvent) {
        const item = event.active.data.current?.equipment as Equipment | undefined;
        setActiveEquipment(item ?? null);
    }

    async function handleDragEnd(event: DragEndEvent) {
        setActiveEquipment(null);

        const { active, over } = event;
        if (!over) return;

        const item = active.data.current?.equipment as Equipment | undefined;
        if (!item) return;

        const newStatus = over.id as EquipmentStatus;
        if (item.status === newStatus) return;

        const previousStatus = item.status;
        const updated = { ...item, status: newStatus };
        syncEquipment(updated);

        try {
            await updateEquipmentStatus(item.id, newStatus);
            toast({ title: `Moved to ${equipmentStatusGroup.find((g) => g.key === newStatus)?.label}`, variant: "success" });
        } catch (error) {
            syncEquipment({ ...item, status: previousStatus });
            toast({ title: "Failed to update status", description: getErrorMessage(error, "The equipment status could not be updated."), variant: "error" });
        }
    }

    return (
        <KanbanBoard onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <KanbanBoard.Columns>
                {equipmentStatusGroup.map((group) => {
                    const items = equipment.filter((e) => e.status === group.key);
                    return (
                        <KanbanBoard.Column key={group.key} id={group.key}>
                            <KanbanBoard.ColumnHeader>
                                <Indicator color={group.color} className="size-6" />
                                <Label.sm>{group.label}</Label.sm>
                                <Label.sm className="text-quaternary ml-auto">{items.length}</Label.sm>
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
                {activeEquipment && <EquipmentItem equipment={activeEquipment} />}
            </KanbanBoard.Overlay>
        </KanbanBoard>
    );
}
