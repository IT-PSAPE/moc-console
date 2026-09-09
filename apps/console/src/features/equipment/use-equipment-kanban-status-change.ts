import type { Equipment, EquipmentStatus } from "@moc/types/equipment";
import { equipmentStatusGroup } from "@moc/types/equipment/constants";
import { updateEquipmentStatus } from "@/data/mutate-equipment";
import { useKanbanStatusChange } from "@/hooks/use-kanban-status-change";
import { useEquipment } from "./equipment-provider";

function getEquipmentStatus(item: Equipment) { return item.status; }
function setEquipmentStatus(item: Equipment, status: EquipmentStatus) { return { ...item, status }; }
function getEquipmentStatusLabel(status: EquipmentStatus) { return equipmentStatusGroup.find((group) => group.key === status)?.label ?? status; }

export function useEquipmentKanbanStatusChange() {
    const { actions: { syncEquipment } } = useEquipment();

    return useKanbanStatusChange<Equipment, EquipmentStatus>({
        dataKey: "equipment",
        getStatus: getEquipmentStatus,
        setStatus: setEquipmentStatus,
        sync: syncEquipment,
        persist: updateEquipmentStatus,
        statusLabel: getEquipmentStatusLabel,
        errorMessage: "The equipment status could not be updated.",
    });
}
