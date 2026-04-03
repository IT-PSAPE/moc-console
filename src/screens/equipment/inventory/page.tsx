import { Card } from "@/components/display/card";
import { Button } from "@/components/controls/button";
import { Input } from "@/components/form/input";
import { Header } from "@/components/display/header";
import { Drawer } from "@/components/overlays/drawer";
import { Badge } from "@/components/display/badge";
import { Paragraph, Title } from "@/components/display/text";
import { Package, Search, Settings2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Decision } from "@/components/display/decision";
import { Spinner } from "@/components/feedback/spinner";
import { EmptyState } from "@/components/feedback/empty-state";
import { DataTable } from "@/components/display/data-table";
import { useEquipment } from "@/features/equipment/equipment-provider";
import { useEquipmentFilters } from "@/features/equipment/use-equipment-filters";
import { EquipmentFilterDrawer } from "@/features/equipment/equipment-filter-drawer";
import { EquipmentDrawer } from "@/features/equipment/equipment-drawer";
import { equipmentStatusLabel, equipmentStatusColor, equipmentCategoryLabel, equipmentCategoryColor } from "@/types/equipment";
import type { Equipment } from "@/types/equipment";

function EquipmentThumbnail({ equipment }: { equipment: Equipment }) {
  if (equipment.thumbnail) {
    return <img src={equipment.thumbnail} alt={equipment.name} className="size-8 rounded object-cover" />;
  }
  return (
    <span className="flex size-8 items-center justify-center rounded bg-secondary text-quaternary">
      <Package className="size-4" />
    </span>
  );
}

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
    actions: { loadEquipment },
  } = useEquipment();

  useEffect(() => {
    loadEquipment();
  }, [loadEquipment]);

  const equipmentFilters = useEquipmentFilters(equipment);
  const { filtered, setSearch, filters: state } = equipmentFilters;

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
          <Title.h6>Inventory</Title.h6>
          <Paragraph.sm className="text-tertiary max-w-2xl">
            Browse all equipment items. Filter by category or status to find what you need.
          </Paragraph.sm>
        </Header.Lead>
      </Header.Root>

      <div className="flex flex-col gap-4 p-4 mx-auto w-full max-w-content">
        <Header.Root className="gap-2 max-mobile:flex-col *:max-mobile:w-full">
          <Header.Lead />
          <Header.Trail className="gap-2 flex-1 justify-end">
            <Input icon={<Search />} placeholder="Search equipment..." className="w-full max-w-sm" value={state.search} onChange={(e) => setSearch(e.target.value)} />
            <Drawer.Root>
              <Drawer.Trigger>
                <Button icon={<Settings2 />} variant="secondary">Filter</Button>
              </Drawer.Trigger>
              <EquipmentFilterDrawer filters={equipmentFilters} />
            </Drawer.Root>
          </Header.Trail>
        </Header.Root>

        <Decision.Root value={filtered} loading={isLoadingEquipment}>
          <Decision.Loading>
            <div className="flex justify-center py-16">
              <Spinner size="lg" />
            </div>
          </Decision.Loading>
          <Decision.Empty>
            <EmptyState icon={<Package />} title="No equipment found" description="Try adjusting your filters or search." />
          </Decision.Empty>
          <Decision.Data>
            <Drawer.Root open={!!selectedEquipment} onOpenChange={handleOpenChange}>
              <Card.Root>
                <Card.Content>
                  <DataTable data={filtered} columns={columns} emptyMessage="No equipment found" onRowClick={(row) => setSelectedEquipment(row)} />
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
          </Decision.Data>
        </Decision.Root>
      </div>
    </section>
  );
}
