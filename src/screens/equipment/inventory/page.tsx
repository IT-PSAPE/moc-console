// import { Card } from "@/components/display/card";
import { randomId } from "@/utils/random-id";
import { Button } from "@/components/controls/button";
import { Input } from "@/components/form/input";
import { Header } from "@/components/display/header";
import { Drawer } from "@/components/overlays/drawer";
import { Paragraph, Title } from "@/components/display/text";
import { Columns3, List, Plus, Search, Settings2, Table as TableIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Spinner } from "@/components/feedback/spinner";
import { useEquipment } from "@/features/equipment/equipment-provider";
import { useEquipmentFilters } from "@/features/equipment/use-equipment-filters";
import { EquipmentFilterDrawer } from "@/features/equipment/equipment-filter-drawer";
import { CreateEquipmentModal } from "@/features/equipment/create-equipment-modal";
import { useFeedback } from "@/components/feedback/feedback-provider";
import { createEquipment } from "@/data/mutate-equipment";
import type { Equipment, EquipmentCategory } from "@/types/equipment";
import { getErrorMessage } from "@/utils/get-error-message";
import { SegmentedControl } from "@/components/controls/segmented-control";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { InventoryLists } from "../../../features/equipment/inventory-list";
import { InventoryKanban } from "../../../features/equipment/inventory-kanban";
import { InventoryTable } from "../../../features/equipment/inventory-table";


export function EquipmentInventoryScreen() {
  const [view, setView] = useState('list');
  const isMobile = useIsMobile()

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

  const handleCreateEquipment = useCallback(async ({ name, serialNumber, category, location }: {
    name: string; serialNumber: string; category: EquipmentCategory; location: string
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
      toast({ title: "Failed to add equipment", description: getErrorMessage(error, "The equipment item could not be added."), variant: "error" });
    }
  }, [addEquipment, toast]);


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

      <Header.Root className='p-4 pt-8 mx-auto max-w-content max-mobile:flex-col max-mobile:gap-2 *:max-mobile:w-full'>
        <Header.Lead className='gap-2 w-full'>
          <SegmentedControl.Root defaultValue="list" onValueChange={(value) => setView(value)} fill={isMobile}>
            <SegmentedControl.Item value="list" icon={<List />}>List</SegmentedControl.Item>
            <SegmentedControl.Item value="table" icon={<TableIcon />}>Table</SegmentedControl.Item>
            <SegmentedControl.Item value="kanban" icon={<Columns3 />}>Kanban</SegmentedControl.Item>
          </SegmentedControl.Root>
        </Header.Lead>
        <Header.Trail className='gap-2 flex-1 justify-end '>
          <Input icon={<Search />} placeholder="Search equipment..." className="w-full max-w-md max-mobile:flex-[1_1_100%]" value={state.search} onChange={(e) => setSearch(e.target.value)} />
          <Drawer.Root>
            <Drawer.Trigger>
              <Button icon={<Settings2 />} variant="secondary">Filter</Button>
            </Drawer.Trigger>
            <EquipmentFilterDrawer filters={equipmentFilters} />
          </Drawer.Root>
          <Button.Icon variant="secondary" icon={<Plus />} onClick={() => setShowCreateModal(true)} />
        </Header.Trail>
      </Header.Root>

      {isLoadingEquipment ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) :
        <>
          {view === 'list' && <InventoryLists equipment={filtered} />}
          {view === 'table' && <InventoryTable equipment={filtered} />}
          {view === 'kanban' && <InventoryKanban equipment={filtered} />}
        </>
      }

      <CreateEquipmentModal open={showCreateModal} onOpenChange={setShowCreateModal} onCreate={handleCreateEquipment} />
    </section>
  );
}
