// import { Card } from "@moc/ui/components/display/card";
import { randomId } from "@moc/utils/random-id";
import { Button } from "@moc/ui/components/controls/button";
import { Input } from "@moc/ui/components/form/input";
import { Header } from "@moc/ui/components/display/header";
import { Drawer } from "@moc/ui/components/overlays/drawer";
import { Paragraph, Title } from "@moc/ui/components/display/text";
import {
  Columns3,
  List,
  Package,
  Plus,
  Search,
  Settings2,
  Table as TableIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner";
import { Decision } from "@moc/ui/components/display/decision";
import { EmptyState } from "@moc/ui/components/feedback/empty-state";
import { useEquipment } from "@/features/equipment/equipment-provider";
import { useEquipmentFilters } from "@/features/equipment/use-equipment-filters";
import { EquipmentFilterDrawer } from "@/features/equipment/equipment-filter-drawer";
import { CreateEquipmentModal } from "@/features/equipment/create-equipment-modal";
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider";
import { createEquipment } from "@moc/data/mutate-equipment";
import type { Equipment, EquipmentCategory } from "@moc/types/equipment";
import { getErrorMessage } from "@moc/utils/get-error-message";
import { SegmentedControl } from "@moc/ui/components/controls/segmented-control";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { InventoryListView } from "@/features/equipment/inventory-list";
import { InventoryKanbanView } from "@/features/equipment/inventory-kanban";
import { InventoryTableView } from "@/features/equipment/inventory-table";

export function EquipmentInventoryScreen() {
  const [view, setView] = useState("list");
  const isMobile = useIsMobile();

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

  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreateEquipment = useCallback(
    async ({
      name,
      serialNumber,
      category,
      location,
    }: {
      name: string;
      serialNumber: string;
      category: EquipmentCategory;
      location: string;
    }) => {
      const newEquipment: Equipment = {
        id: randomId(),
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
        toast({
          title: "Failed to add equipment",
          description: getErrorMessage(
            error,
            "The equipment item could not be added.",
          ),
          variant: "error",
        });
      }
    },
    [addEquipment, toast],
  );

  return (
    <section>
      <Header className="p-4 pt-8 mx-auto max-w-content">
        <Header.Lead className="gap-2">
          <Title.h6>Inventory</Title.h6>
          <Paragraph.sm className="text-tertiary max-w-2xl">
            Browse all equipment items. Filter by category or status to find
            what you need.
          </Paragraph.sm>
        </Header.Lead>
      </Header>

      <Header className="p-4 pt-8 mx-auto max-w-content max-mobile:flex-col max-mobile:gap-2 *:max-mobile:w-full">
        <Header.Lead className="gap-2 w-full">
          <SegmentedControl defaultValue="list" onValueChange={(value) => setView(value)} fill={isMobile} >
            <SegmentedControl.Item value="list" icon={<List />}>
              List
            </SegmentedControl.Item>
            <SegmentedControl.Item value="table" icon={<TableIcon />}>
              Table
            </SegmentedControl.Item>
            <SegmentedControl.Item value="kanban" icon={<Columns3 />}>
              Kanban
            </SegmentedControl.Item>
          </SegmentedControl>
        </Header.Lead>
        <Header.Trail className="gap-2 flex-1 justify-end ">
          <Input
            icon={<Search />}
            placeholder="Search equipment..."
            className="w-full max-w-md max-mobile:flex-[1_1_100%]"
            value={state.search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Drawer>
            <Drawer.Trigger>
              <Button icon={<Settings2 />} variant="secondary">
                Filter
              </Button>
            </Drawer.Trigger>
            <EquipmentFilterDrawer filters={equipmentFilters} />
          </Drawer>
          <Button.Icon
            variant="secondary"
            icon={<Plus />}
            onClick={() => setShowCreateModal(true)}
          />
        </Header.Trail>
      </Header>

      <Decision value={filtered} loading={isLoadingEquipment}>
        <Decision.Loading>
          <LoadingSpinner className="py-6" />
        </Decision.Loading>
        <Decision.Empty>
          <EmptyState
            icon={<Package />}
            title={state.search.trim() ? "No equipment matches your search" : "No equipment yet"}
            description={state.search.trim() ? "Try a different search term or clear filters." : "Add equipment to start tracking inventory."}
          />
        </Decision.Empty>
        <Decision.Data>
          {view === "list" && <InventoryListView equipment={filtered} />}
          {view === "table" && <InventoryTableView equipment={filtered} />}
          {view === "kanban" && <InventoryKanbanView equipment={filtered} />}
        </Decision.Data>
      </Decision>

      <CreateEquipmentModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onCreate={handleCreateEquipment}
      />
    </section>
  );
}
