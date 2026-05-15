import { Button } from "@moc/ui/components/controls/button";
import { Header } from "@moc/ui/components/display/header";
import { Input } from "@moc/ui/components/form/input";
import { Paragraph, Title } from "@moc/ui/components/display/text";

import { useEffect, useMemo, useState } from "react";
import { Drawer } from "@moc/ui/components/overlays/drawer";
import { SegmentedControl } from "@moc/ui/components/controls/segmented-control";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useEquipment } from "@/features/equipment/equipment-provider";
import { EquipmentFilterDrawer } from "@/features/equipment/equipment-filter-drawer";
import { useEquipmentFilters } from "@/features/equipment/use-equipment-filters";
import { MaintenanceListView } from "@/features/equipment/maintenance-list";
import { MaintenanceTableView } from "@/features/equipment/maintenance-table";
import {
  List,
  Search,
  Settings2,
  Table as TableIcon,
} from "lucide-react";

export function EquipmentMaintenanceScreen() {
  const [view, setView] = useState("list");
  const isMobile = useIsMobile();

  const {
    state: { equipment },
    actions: { loadEquipment },
  } = useEquipment();

  useEffect(() => {
    loadEquipment();
  }, [loadEquipment]);

  const maintenanceItems = useMemo(
    () => equipment.filter((e) => e.status === "maintenance"),
    [equipment],
  );

  const equipmentFilters = useEquipmentFilters(maintenanceItems);
  const { filtered, setSearch, filters: state } = equipmentFilters;

  return (
    <section>
      <Header className="p-4 pt-8 mx-auto max-w-content">
        <Header.Lead className="gap-2">
          <Title.h6>Maintenance</Title.h6>
          <Paragraph.sm className="text-tertiary max-w-2xl">
            Equipment currently flagged as faulty or under repair.
          </Paragraph.sm>
        </Header.Lead>
      </Header>

      <Header className="p-4 pt-8 mx-auto max-w-content max-mobile:flex-col max-mobile:gap-2 *:max-mobile:w-full">
        <Header.Lead className="gap-2 w-full">
          <SegmentedControl
            defaultValue="list"
            onValueChange={setView}
            fill={isMobile}
          >
            <SegmentedControl.Item value="list" icon={<List />}>
              List
            </SegmentedControl.Item>
            <SegmentedControl.Item value="table" icon={<TableIcon />}>
              Table
            </SegmentedControl.Item>
          </SegmentedControl>
        </Header.Lead>
        <Header.Trail className="gap-2 flex-1 justify-end">
          <Input
            icon={<Search />}
            placeholder="Search maintenance..."
            className="w-full max-w-md"
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
        </Header.Trail>
      </Header>

      <div className="flex flex-col gap-4 p-4 mx-auto w-full max-w-content">
        {view === "list" && <MaintenanceListView equipment={filtered} />}
        {view === "table" && <MaintenanceTableView equipment={filtered} />}
      </div>
    </section>
  );
}
