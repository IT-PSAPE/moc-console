import { Card } from "@moc/ui/components/display/card";
import { Indicator } from "@moc/ui/components/display/indicator";
import { Label } from "@moc/ui/components/display/text";
import { Decision } from "@moc/ui/components/display/decision";
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner";
import { EmptyState } from "@moc/ui/components/feedback/empty-state";
import { Archive } from "lucide-react";
import type { Equipment } from "@moc/types/equipment";
import { useEquipment } from "./equipment-provider";
import { EquipmentItem } from "./equipment-item";

export function MaintenanceListView({ equipment }: { equipment: Equipment[] }) {
  const { state: { isLoadingEquipment } } = useEquipment();

  return (
    <Card>
      <Card.Header tight className="gap-1.5">
        <Indicator color="gray" className="size-6" />
        <Label.sm>Maintenance</Label.sm>
      </Card.Header>
      <Card.Content ghost className="flex flex-col gap-1.5">
        <Decision value={equipment} loading={isLoadingEquipment}>
          <Decision.Loading>
            <LoadingSpinner className="py-6" />
          </Decision.Loading>
          <Decision.Empty>
            <EmptyState
              icon={<Archive />}
              title="No equipment in maintenance"
              description="Equipment flagged for maintenance will appear here."
            />
          </Decision.Empty>
          <Decision.Data>
            {equipment.map((item) => (
              <EquipmentItem key={item.id} equipment={item} />
            ))}
          </Decision.Data>
        </Decision>
      </Card.Content>
    </Card>
  );
}
