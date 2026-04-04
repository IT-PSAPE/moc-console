import { Card } from "@/components/display/card";
import { Button } from "@/components/controls/button";
import { Input } from "@/components/form/input";
import { Header } from "@/components/display/header";
import { Drawer } from "@/components/overlays/drawer";
import { Badge } from "@/components/display/badge";
import { Label, Paragraph, TextBlock, Title } from "@/components/display/text";
import { ArrowUpRight, CalendarCheck, CircleCheck, Package, Search, Settings2, Wrench } from "lucide-react";
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
  {
    key: "bookedBy",
    header: "Booked By",
    render: (value: unknown) => (value as string) || <span className="text-quaternary">—</span>,
  },
  {
    key: "lastActiveDate",
    header: "Last Active",
    render: (value: unknown) => new Date(value as string).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }),
  },
];

export function EquipmentOverviewScreen() {
  const {
    state: { equipment, isLoadingEquipment },
    actions: { loadEquipment },
  } = useEquipment();

  useEffect(() => {
    loadEquipment();
  }, [loadEquipment]);

  const equipmentFilters = useEquipmentFilters(equipment);
  const { filtered, setSearch, filters: state } = equipmentFilters;

  // Stats — always from unfiltered data
  const totalCount = equipment.length;
  const availableCount = equipment.filter((e) => e.status === "available").length;
  const bookedCount = equipment.filter((e) => e.status === "booked").length;
  const bookedOutCount = equipment.filter((e) => e.status === "booked_out").length;
  const maintenanceCount = equipment.filter((e) => e.status === "maintenance").length;

  // Recent activity — filtered, sorted by last active desc, limited to 10
  const recentActivity = [...filtered]
    .sort((a, b) => new Date(b.lastActiveDate).getTime() - new Date(a.lastActiveDate).getTime())
    .slice(0, 10);

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
          <Title.h6>Equipment</Title.h6>
          <Paragraph.sm className="text-tertiary max-w-2xl">
            Manage and track all equipment. View availability, bookings, and maintenance at a glance.
          </Paragraph.sm>
        </Header.Lead>
      </Header.Root>

      <Decision.Root value={equipment} loading={isLoadingEquipment}>
        <Decision.Loading>
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        </Decision.Loading>
        <Decision.Empty>
          <EmptyState icon={<Package />} title="No equipment yet" description="Add equipment to start tracking your inventory." />
        </Decision.Empty>
        <Decision.Data>
          <div className="grid grid-cols-5 gap-4 p-4 pt-8 mx-auto w-full max-w-content max-mobile:grid-cols-2 max-mobile:gap-2">
            <Card.Root>
              <Card.Header className="gap-1.5">
                <Package className="size-4" />
                <Label.sm>Total Equipment</Label.sm>
              </Card.Header>
              <Card.Content className="p-4">
                <TextBlock className="title-h4">{totalCount}</TextBlock>
              </Card.Content>
            </Card.Root>
            <Card.Root>
              <Card.Header className="gap-1.5">
                <CircleCheck className="size-4" />
                <Label.sm>Available</Label.sm>
              </Card.Header>
              <Card.Content className="p-4">
                <TextBlock className="title-h4">{availableCount}</TextBlock>
              </Card.Content>
            </Card.Root>
            <Card.Root>
              <Card.Header className="gap-1.5">
                <CalendarCheck className="size-4" />
                <Label.sm>Booked</Label.sm>
              </Card.Header>
              <Card.Content className="p-4">
                <TextBlock className="title-h4">{bookedCount}</TextBlock>
              </Card.Content>
            </Card.Root>
            <Card.Root>
              <Card.Header className="gap-1.5">
                <ArrowUpRight className="size-4" />
                <Label.sm>Booked Out</Label.sm>
              </Card.Header>
              <Card.Content className="p-4">
                <TextBlock className="title-h4">{bookedOutCount}</TextBlock>
              </Card.Content>
            </Card.Root>
            <Card.Root>
              <Card.Header className="gap-1.5">
                <Wrench className="size-4" />
                <Label.sm>In Maintenance</Label.sm>
              </Card.Header>
              <Card.Content className="p-4">
                <TextBlock className="title-h4">{maintenanceCount}</TextBlock>
              </Card.Content>
            </Card.Root>
          </div>

          <div className="flex flex-col gap-4 p-4 pt-8 mx-auto w-full max-w-content">
            <Header.Root className="gap-2 max-mobile:flex-col *:max-mobile:w-full">
              <Header.Lead className="gap-2">
                <Label.md>Recent Activity</Label.md>
              </Header.Lead>
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

            <Drawer.Root open={!!selectedEquipment} onOpenChange={handleOpenChange}>
              <Card.Root>
                <Card.Content>
                  <DataTable data={recentActivity} columns={columns} emptyMessage="No recent activity" onRowClick={(row) => setSelectedEquipment(row)} />
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
        </Decision.Data>
      </Decision.Root>
    </section>
  );
}
