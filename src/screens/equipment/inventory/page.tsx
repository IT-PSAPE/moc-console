import { Card } from "@/components/display/card";
import { Button } from "@/components/controls/button";
import { Input } from "@/components/form/input";
import { Header } from "@/components/display/header";
import { Drawer } from "@/components/overlays/drawer";
import { Badge } from "@/components/display/badge";
import { Paragraph, Title } from "@/components/display/text";
import { Plus, Search, Settings2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/feedback/spinner";
import { DataTable } from "@/components/display/data-table";
import { useEquipment } from "@/features/equipment/equipment-provider";
import { useEquipmentFilters } from "@/features/equipment/use-equipment-filters";
import { EquipmentFilterDrawer } from "@/features/equipment/equipment-filter-drawer";
import { EquipmentDrawer } from "@/features/equipment/equipment-drawer";
import { CreateEquipmentModal } from "@/features/equipment/create-equipment-modal";
import { useFeedback } from "@/components/feedback/feedback-provider";
import { createEquipment } from "@/data/mutate-equipment";
import { equipmentStatusLabel, equipmentStatusColor, equipmentCategoryLabel, equipmentCategoryColor } from "@/types/equipment";
import type { Equipment, EquipmentCategory } from "@/types/equipment";
import { EquipmentThumbnail } from "@/features/equipment/equipment-thumbnail";
import { getErrorMessage } from "@/utils/get-error-message";


const columns = [
  {
    key: "thumbnail",
    header: "",
    width: 48,
    render: (_: unknown, row: Equipment) => <EquipmentThumbnail equipment={row} />,
  },
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
    key: "status",
    header: "Status",
    render: (_: unknown, row: Equipment) => (
      <Badge label={equipmentStatusLabel[row.status]} color={equipmentStatusColor[row.status]} />
    ),
  },
  { key: "location", header: "Location" },
];

export function EquipmentInventoryScreen() {
  const {
    state: { equipment, isLoadingEquipment },
    actions: { loadEquipment, addEquipment },
  } = useEquipment();
  const { toast } = useFeedback();

  useEffect(() => {
    loadEquipment();
  }, [loadEquipment]);

  const equipmentFilters = useEquipmentFilters(equipment);
  const { filtered, setSearch, filters: state } = equipmentFilters;

  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreateEquipment = useCallback(async ({ name, serialNumber, category, location }: {
    name: string; serialNumber: string; category: EquipmentCategory; location: string
  }) => {
    const newEquipment: Equipment = {
      id: crypto.randomUUID(),
      name,
      serialNumber,
      category,
      status: "available",
      location,
      notes: "",
      lastActiveDate: new Date().toISOString(),
      bookedBy: null,
      thumbnail: null,
    };
    try {
      const saved = await createEquipment(newEquipment);
      addEquipment(saved);
      setShowCreateModal(false);
      toast({ title: "Equipment added", variant: "success" });
    } catch (error) {
      toast({ title: "Failed to add equipment", description: getErrorMessage(error, "The equipment item could not be added."), variant: "error" });
    }
  }, [addEquipment, toast]);
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
          <Title.h6>Inventory</Title.h6>
          <Paragraph.sm className="text-tertiary max-w-2xl">
            Browse all equipment items. Filter by category or status to find what you need.
          </Paragraph.sm>
        </Header.Lead>
      </Header.Root>

      <div className="flex flex-col gap-4 p-4 mx-auto w-full max-w-content">
        <Drawer.Root open={!!selectedEquipment} onOpenChange={handleOpenChange}>
          <Card.Root>
            <Card.Header className="gap-2 flex-1 justify-end">
              <Input icon={<Search />} placeholder="Search equipment..." className="w-full max-w-sm" value={state.search} onChange={(e) => setSearch(e.target.value)} />
              <Drawer.Root>
                <Drawer.Trigger>
                  <Button icon={<Settings2 />} variant="secondary">Filter</Button>
                </Drawer.Trigger>
                <EquipmentFilterDrawer filters={equipmentFilters} />
              </Drawer.Root>
              <Button.Icon variant="secondary" icon={<Plus />} onClick={() => setShowCreateModal(true)} />
            </Card.Header>
            <Card.Content className="!border-secondary overflow-hidden">
              {isLoadingEquipment ? (
                <div className="flex justify-center py-16"><Spinner /></div>
              ) : (
                <DataTable data={filtered} columns={columns} emptyMessage="No equipment found" onRowClick={(row) => setSelectedEquipment(row)} />
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

      <CreateEquipmentModal open={showCreateModal} onOpenChange={setShowCreateModal} onCreate={handleCreateEquipment} />
    </section>
  );
}
