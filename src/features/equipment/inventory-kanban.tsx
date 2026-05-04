import { Card } from "@/components/display/card";
import { Indicator } from "@/components/display/indicator";
import { Label } from "@/components/display/text";
import type { Equipment, EquipmentStatus } from "@/types/equipment";
import { equipmentStatusGroup } from "@/types/equipment/constants";
import { updateEquipmentStatus } from "@/data/mutate-equipment";
import { useFeedback } from "@/components/feedback/feedback-provider";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDroppable, closestCenter, type DragStartEvent, type DragEndEvent } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useState } from "react";
import { getErrorMessage } from "@/utils/get-error-message";
import { EquipmentItem } from "@/features/equipment/equipment-item";
import { useEquipment } from "@/features/equipment/equipment-provider";

function DraggableEquipmentItem({ equipment }: { equipment: Equipment }) {
    const [drawerOpen, setDrawerOpen] = useState(false);
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: equipment.id,
        data: { equipment },
        disabled: drawerOpen,
    });

    const handleDrawerOpenChange = useCallback((open: boolean) => {
        setDrawerOpen(open);
    }, []);

    const style = {
        transform: isDragging ? undefined : CSS.Translate.toString(transform),
    };

    return (
        <div ref={setNodeRef} style={style} {...(drawerOpen ? {} : { ...listeners, ...attributes })}>
            {isDragging ? (
                <div className="rounded-lg border-2 border-dashed border-secondary">
                    <div className="invisible">
                        <EquipmentItem equipment={equipment} />
                    </div>
                </div>
            ) : (
                <EquipmentItem equipment={equipment} onDrawerOpenChange={handleDrawerOpenChange} />
            )}
        </div>
    );
}

function DroppableColumn({
    group,
    items,
}: {
    group: (typeof equipmentStatusGroup)[number];
    items: Equipment[];
}) {
    const { setNodeRef, isOver } = useDroppable({ id: group.key });

    return (
        <Card.Root className={isOver ? "ring-2 ring-brand ring-offset-2 transition-shadow" : "transition-shadow"}>
            <Card.Header className="gap-1.5">
                <Indicator color={group.color} className="size-6" />
                <Label.sm>{group.label}</Label.sm>
                <Label.sm className="text-quaternary ml-auto">{items.length}</Label.sm>
            </Card.Header>
            <div ref={setNodeRef}>
                <Card.Content ghost className="flex flex-col gap-1.5 min-h-16">
                    {items.map((e) => (
                        <DraggableEquipmentItem key={e.id} equipment={e} />
                    ))}
                </Card.Content>
            </div>
        </Card.Root>
    );
}

export function InventoryKanban({ equipment }: { equipment: Equipment[] }) {
    const { actions: { syncEquipment } } = useEquipment();
    const { toast } = useFeedback();
    const [activeEquipment, setActiveEquipment] = useState<Equipment | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    );

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
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="overflow-x-auto w-full">
                <div className="flex gap-3 p-4 pt-0 mx-auto w-full max-w-content *:flex-1 *:min-w-sm">
                    {equipmentStatusGroup.map((group) => {
                        const items = equipment.filter((e) => e.status === group.key);
                        return <DroppableColumn key={group.key} group={group} items={items} />;
                    })}
                </div>
            </div>

            <DragOverlay>
                {activeEquipment && (
                    <div className="opacity-90 rotate-2 scale-105">
                        <EquipmentItem equipment={activeEquipment} />
                    </div>
                )}
            </DragOverlay>
        </DndContext>
    );
}
