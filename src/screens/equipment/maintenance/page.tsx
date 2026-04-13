import { Card } from "@/components/display/card";
import { Badge } from "@/components/display/badge";
import { Header } from "@/components/display/header";
import { Paragraph, Title } from "@/components/display/text";


import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Spinner } from "@/components/feedback/spinner";
import { DataTable } from "@/components/display/data-table";
import { Drawer } from "@/components/overlays/drawer";
import { useEquipment } from "@/features/equipment/equipment-provider";
import { EquipmentDrawer } from "@/features/equipment/equipment-drawer";
import { equipmentCategoryLabel, equipmentCategoryColor } from "@/types/equipment";
import type { Equipment } from "@/types/equipment";

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

export function EquipmentMaintenanceScreen() {
  const {
    state: { equipment, isLoadingEquipment },
    actions: { loadEquipment },
  } = useEquipment();

  useEffect(() => {
    loadEquipment();
  }, [loadEquipment]);

  const maintenanceItems = useMemo(
    () => equipment.filter((e) => e.status === "maintenance"),
    [equipment],
  );

  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const isDirtyRef = useRef(false);
  const requestCloseRef = useRef<(() => void) | null>(null);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open && isDirtyRef.current) {
      requestCloseRef.current?.();
    } else if (!open) {
      setSelectedEquipment(null);
    }
  }, []);

  const handleEquipmentClose = useCallback(() => {
    setSelectedEquipment(null);
  }, []);

  return (
    <section>
      <Header.Root className="p-4 pt-8 mx-auto max-w-content">
        <Header.Lead className="gap-2">
          <Title.h6>Maintenance</Title.h6>
          <Paragraph.sm className="text-tertiary max-w-2xl">
            Equipment currently flagged as faulty or under repair.
          </Paragraph.sm>
        </Header.Lead>
      </Header.Root>

      <div className="flex flex-col gap-4 p-4 mx-auto w-full max-w-content">
        <Drawer.Root open={!!selectedEquipment} onOpenChange={handleOpenChange}>
          <Card.Root>
            <Card.Content className="!border-secondary overflow-hidden">
              {isLoadingEquipment ? (
                <div className="flex justify-center py-16"><Spinner /></div>
              ) : (
                <DataTable data={maintenanceItems} columns={columns} emptyMessage="All equipment is in working order." onRowClick={(row) => setSelectedEquipment(row)} />
              )}
            </Card.Content>
          </Card.Root>
          {selectedEquipment && (
            <EquipmentDrawer
              equipment={selectedEquipment}
              onEquipmentClose={handleEquipmentClose}
              isDirtyRef={isDirtyRef}
              requestCloseRef={requestCloseRef}
            />
          )}
        </Drawer.Root>
      </div>
    </section>
  );
}
