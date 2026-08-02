import { GroupedList } from "@moc/ui/components/display/grouped-list";
import { Indicator } from "@moc/ui/components/display/indicator";
import { Label } from "@moc/ui/components/display/text";
import { useMemo } from "react";
import { equipmentStatusGroup } from "@moc/types/equipment/constants";
import type { Equipment } from "@moc/types/equipment";
import { EquipmentItem } from "./equipment-item";

const activeStatusGroups = equipmentStatusGroup.filter((g) => g.key !== "maintenance");

export function InventoryListView({ equipment }: { equipment: Equipment[] }) {
    const visible = useMemo(() => equipment.filter((e) => e.status !== "maintenance"), [equipment]);

    return (
        <GroupedList>
            {activeStatusGroups.map((group) => {
                const items = visible.filter((e) => e.status === group.key);
                if (items.length === 0) return null;
                return (
                    <GroupedList.Group key={group.key}>
                        <GroupedList.Header>
                            <Indicator color={group.color} className="size-6" />
                            <Label.sm>{group.label}</Label.sm>
                        </GroupedList.Header>
                        <GroupedList.Content>
                            {items.map((e) => (
                                <EquipmentItem key={e.id} equipment={e} />
                            ))}
                        </GroupedList.Content>
                    </GroupedList.Group>
                );
            })}
        </GroupedList>
    );
}
