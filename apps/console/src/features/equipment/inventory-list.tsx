import { GroupedList } from "@moc/ui/components/display/grouped-list";
import { Indicator } from "@moc/ui/components/display/indicator";
import { Label } from "@moc/ui/components/display/text";
import { equipmentStatusGroup } from "@moc/types/equipment/constants";
import type { Equipment } from "@moc/types/equipment";
import { EquipmentItemContent } from "./equipment-item-content";
import { ResponsiveDetailAction } from "@/features/responsive-detail-action";
import { routes } from "@/screens/console-routes";

export function InventoryListView({ equipment, onSelect }: { equipment: Equipment[]; onSelect: (equipment: Equipment) => void }) {
    function renderEquipment(item: Equipment) {
        function handleSelect() {
            onSelect(item)
        }

        return (
            <ResponsiveDetailAction.Card key={item.id} mobileHref={`/${routes.equipment}/${item.id}`} onActivate={handleSelect}>
                <EquipmentItemContent equipment={item} />
            </ResponsiveDetailAction.Card>
        )
    }

    return (
        <GroupedList>
            {equipmentStatusGroup.map((group) => {
                const items = equipment.filter((e) => e.status === group.key);
                if (items.length === 0) return null;
                return (
                    <GroupedList.Group key={group.key}>
                        <GroupedList.Header>
                            <Indicator color={group.color} className="size-6" />
                            <Label.sm>{group.label}</Label.sm>
                        </GroupedList.Header>
                        <GroupedList.Content>
                            {items.map(renderEquipment)}
                        </GroupedList.Content>
                    </GroupedList.Group>
                );
            })}
        </GroupedList>
    );
}
