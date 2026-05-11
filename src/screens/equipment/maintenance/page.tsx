import { Button } from "@/components/controls/button";
import { Badge } from "@/components/display/badge";
import { Header } from "@/components/display/header";
import { Input } from "@/components/form/input";
import { Label, Paragraph, Title } from "@/components/display/text";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LoadingSpinner, Spinner } from "@/components/feedback/spinner";
import { DataTable } from "@/components/display/data-table";
import { Drawer } from "@/components/overlays/drawer";
import { SegmentedControl } from "@/components/controls/segmented-control";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useEquipment } from "@/features/equipment/equipment-provider";
import { EquipmentDrawer } from "@/features/equipment/equipment-drawer";
import { EquipmentFilterDrawer } from "@/features/equipment/equipment-filter-drawer";
import { EquipmentItem } from "@/features/equipment/equipment-item";
import { useEquipmentFilters } from "@/features/equipment/use-equipment-filters";
import {
  equipmentCategoryLabel,
  equipmentCategoryColor,
} from "@/types/equipment";
import type { Equipment } from "@/types/equipment";
import {
  Archive,
  List,
  Search,
  Settings2,
  Table as TableIcon,
} from "lucide-react";
import { Card } from "@/components/display/card";
import { Indicator } from "@/components/display/indicator";
import { EmptyState } from "@/components/feedback/empty-state";

const columns = [
  { key: "name", header: "Equipment" },
  { key: "serialNumber", header: "Serial Number" },
  {
    key: "category",
    header: "Category",
    render: (_: unknown, row: Equipment) => (
      <Badge
        label={equipmentCategoryLabel[row.category]}
        color={equipmentCategoryColor[row.category]}
      />
    ),
  },
  {
    key: "notes",
    header: "Notes",
    render: (value: unknown) =>
      (value as string) || <span className="text-quaternary">—</span>,
  },
];

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
        {view === "list" && <EquipmentMaintenanceList filtered={filtered} />}
        {view === "table" && <EquipmentMaintenanceTable filtered={filtered} />}
      </div>
    </section>
  );
}

function EquipmentMaintenanceTable({ filtered }: { filtered: Equipment[] }) {
  const {
    state: { isLoadingEquipment },
  } = useEquipment();

  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(
    null,
  );
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

  if (isLoadingEquipment) return <LoadingSpinner className="py-16" />;

  if (filtered.length === 0)
    return EmptyState({
      icon: <Archive />,
      title: "No equipment in maintenance",
      description: "Equipment flagged for maintenance will appear here.",
      className: "py-8",
    });

  return (
    <Drawer open={!!selectedEquipment} onOpenChange={handleOpenChange}>
      <DataTable
        data={filtered}
        columns={columns}
        emptyMessage="All equipment is in working order."
        onRowClick={(row) => setSelectedEquipment(row)}
        className="rounded-lg border border-secondary overflow-hidden"
      />
      {selectedEquipment && (
        <EquipmentDrawer
          equipment={selectedEquipment}
          onEquipmentClose={handleEquipmentClose}
          isDirtyRef={isDirtyRef}
          requestCloseRef={requestCloseRef}
        />
      )}
    </Drawer>
  );
}

function EquipmentMaintenanceList({ filtered }: { filtered: Equipment[] }) {
  const {
    state: { isLoadingEquipment },
  } = useEquipment();

  return (
    <Card>
      <Card.Header className="gap-1.5">
        <Indicator color="gray" className="size-6" />
        <Label.sm>Maintenance</Label.sm>
      </Card.Header>
      <Card.Content ghost>
        {isLoadingEquipment ? (
          <LoadingSpinner className="py-8" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Archive />}
            title="No equipment in maintenance"
            description="Equipment flagged for maintenance will appear here."
            className="py-8"
          />
        ) : (
          <div className="flex flex-col gap-1.5">
            {filtered.map((item) => (
              <EquipmentItem key={item.id} equipment={item} />
            ))}
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
