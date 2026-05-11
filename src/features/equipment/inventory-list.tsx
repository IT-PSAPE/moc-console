import { Card } from "@/components/display/card";
import { Indicator } from "@/components/display/indicator";
import { Label } from "@/components/display/text";
import { useMemo } from "react";
import { equipmentStatusGroup } from "@/types/equipment/constants";
import type { Equipment } from "@/types/equipment";
import { EquipmentItem } from "./equipment-item";

const activeStatusGroups = equipmentStatusGroup.filter((g) => g.key !== "maintenance");

export function InventoryListView({ equipment }: { equipment: Equipment[] }) {
    const visible = useMemo(() => equipment.filter((e) => e.status !== "maintenance"), [equipment]);

    return (
        <div className="flex flex-col gap-4 p-4 pt-0 mx-auto w-full max-w-content">
            {activeStatusGroups.map((group) => {
                const items = visible.filter((e) => e.status === group.key);
                if (items.length === 0) return null;
                return (
                    <Card key={group.key}>
                        <Card.Header tight className="gap-1.5">
                            <Indicator color={group.color} className="size-6" />
                            <Label.sm>{group.label}</Label.sm>
                            <Label.sm className="text-quaternary ml-auto">{items.length}</Label.sm>
                        </Card.Header>
                        <Card.Content ghost className="flex flex-col gap-1.5">
                            {items.map((e) => (
                                <EquipmentItem key={e.id} equipment={e} />
                            ))}
                        </Card.Content>
                    </Card>
                );
            })}
        </div>
    );
}
