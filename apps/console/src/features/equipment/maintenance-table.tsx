import { Badge } from "@moc/ui/components/display/badge";
import { DataTable } from "@moc/ui/components/display/data-table";
import { Drawer } from "@moc/ui/components/overlays/drawer";
import { Decision } from "@moc/ui/components/display/decision";
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner";
import { EmptyState } from "@moc/ui/components/feedback/empty-state";
import { useTableRowDrawer } from "@/hooks/use-drawer-item";
import { Archive } from "lucide-react";
import type { Equipment } from "@moc/types/equipment";
import { equipmentCategoryLabel, equipmentCategoryColor } from "@moc/types/equipment";
import { useEquipment } from "./equipment-provider";
import { EquipmentDrawer } from "./equipment-drawer";

const columns = [
  { key: "name", header: "Equipment" },
  { key: "serialNumber", header: "Serial Number" },
  {
    key: "category",
    header: "Category",
    render: (_: unknown, row: Equipment) => (
      <Badge label={equipmentCategoryLabel[row.category]} color={equipmentCategoryColor[row.category]} />
    ),
  },
  {
    key: "notes",
    header: "Notes",
    render: (value: unknown) => (value as string) || <span className="text-quaternary">—</span>,
  },
];

export function MaintenanceTableView({ equipment }: { equipment: Equipment[] }) {
  const { state: { isLoadingEquipment } } = useEquipment();
  const { selected, setSelected, isDirtyRef, requestCloseRef, handleOpenChange, handleClose } =
    useTableRowDrawer<Equipment>();

  return (
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
        <Drawer open={!!selected} onOpenChange={handleOpenChange}>
          <DataTable
            data={equipment}
            columns={columns}
            emptyMessage="All equipment is in working order."
            onRowClick={(row) => setSelected(row)}
            className="rounded-lg border border-secondary overflow-hidden"
          />
          {selected && (
            <EquipmentDrawer
              equipment={selected}
              onEquipmentClose={handleClose}
              isDirtyRef={isDirtyRef}
              requestCloseRef={requestCloseRef}
            />
          )}
        </Drawer>
      </Decision.Data>
    </Decision>
  );
}
