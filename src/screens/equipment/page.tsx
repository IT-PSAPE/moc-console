import { Card } from "@/components/display/card";
import { Button } from "@/components/controls/button";
import { Input } from "@/components/form/input";
import { Header } from "@/components/display/header";
import { Drawer } from "@/components/overlays/drawer";
import { Badge } from "@/components/display/badge";
import { Label, Paragraph, TextBlock, Title } from "@/components/display/text";
import { ArrowUpRight, CalendarX2Icon, CircleAlert, CircleCheck, Package, Search, Settings2, Wrench } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Spinner } from "@/components/feedback/spinner";
import { DataTable } from "@/components/display/data-table";
import { useEquipment } from "@/features/equipment/equipment-provider";
import { useEquipmentFilters } from "@/features/equipment/use-equipment-filters";
import { EquipmentFilterDrawer } from "@/features/equipment/equipment-filter-drawer";
import { EquipmentDrawer } from "@/features/equipment/equipment-drawer";
import { equipmentStatusColor, equipmentStatusLabel } from "@/types/equipment";
import type { Equipment } from "@/types/equipment";
import { formatUtcIsoInBrowserTimeZone } from "@/utils/browser-date-time";

type OverdueBookingItem = Record<string, unknown> & {
  id: string;
  equipmentId: string;
  equipmentName: string;
  bookedBy: string;
  checkedOutDate: string;
  expectedReturnAt: string;
};

type FaultyEquipmentItem = Record<string, unknown> & Equipment;

const overdueColumns = [
  { key: "equipmentName", header: "Equipment" },
  { key: "bookedBy", header: "Booked By" },
  {
    key: "checkedOutDate",
    header: "Checked Out",
    render: (value: unknown) => formatUtcIsoInBrowserTimeZone(value as string),
  },
  {
    key: "expectedReturnAt",
    header: "Expected Return",
    render: (value: unknown) => formatUtcIsoInBrowserTimeZone(value as string),
  },
];

const faultyColumns = [
  { key: "name", header: "Equipment" },
  { key: "location", header: "Location" },
  {
    key: "status",
    header: "Status",
    render: (_: unknown, row: FaultyEquipmentItem) => (
      <Badge label={equipmentStatusLabel[row.status]} color={equipmentStatusColor[row.status]} />
    ),
  },
  {
    key: "lastActiveDate",
    header: "Last Active",
    render: (value: unknown) => formatUtcIsoInBrowserTimeZone(value as string, { day: "numeric", month: "short", year: "numeric" }),
  },
  {
    key: "notes",
    header: "Issue",
    render: (value: unknown) => (value as string) || <span className="text-quaternary">No note</span>,
  },
];

export function EquipmentOverviewScreen() {
  const {
    state: { equipment, bookings, isLoadingEquipment, isLoadingBookings },
    actions: { loadEquipment, loadBookings },
  } = useEquipment();

  useEffect(() => {
    loadEquipment();
    loadBookings();
  }, [loadEquipment, loadBookings]);

  const equipmentFilters = useEquipmentFilters(equipment);
  const { filtered, setSearch, filters: state } = equipmentFilters;

  // Stats — always from unfiltered data
  const totalCount = equipment.length;
  const availableCount = equipment.filter((e) => e.status === "available").length;
  const bookedOutCount = equipment.filter((e) => e.status === "booked_out").length;

  const equipmentMap = useMemo(() => {
    const map = new Map<string, Equipment>();
    for (const item of equipment) map.set(item.id, item);
    return map;
  }, [equipment]);

  const filteredEquipmentIds = useMemo(() => new Set(filtered.map((item) => item.id)), [filtered]);

  const overdueItems = useMemo<OverdueBookingItem[]>(() => {
    const now = new Date();
    return bookings
      .filter((booking) => booking.status !== "returned" && !booking.returnedDate && filteredEquipmentIds.has(booking.equipmentId) && new Date(booking.expectedReturnAt) < now)
      .map((booking) => ({
        id: booking.id,
        equipmentId: booking.equipmentId,
        equipmentName: booking.equipmentName,
        bookedBy: booking.bookedBy,
        checkedOutDate: booking.checkedOutDate,
        expectedReturnAt: booking.expectedReturnAt,
      }))
      .sort((a, b) => new Date(a.expectedReturnAt).getTime() - new Date(b.expectedReturnAt).getTime())
      .slice(0, 10);
  }, [bookings, filteredEquipmentIds]);

  const faultyItems = useMemo<FaultyEquipmentItem[]>(() => (
    filtered
      .filter((item) => item.status === "maintenance")
      .sort((a, b) => new Date(a.lastActiveDate).getTime() - new Date(b.lastActiveDate).getTime())
  ), [filtered]);

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

  const handleOverdueRowClick = useCallback((row: OverdueBookingItem) => {
    const item = equipmentMap.get(row.equipmentId);
    if (item) setSelectedEquipment(item);
  }, [equipmentMap]);

  const handleFaultyRowClick = useCallback((row: FaultyEquipmentItem) => {
    setSelectedEquipment(row);
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

      <div className="grid grid-cols-2 gap-4 p-4 pt-8 mx-auto w-full max-w-content md:grid-cols-4 max-mobile:gap-2">
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
                <ArrowUpRight className="size-4" />
                <Label.sm>Booked Out</Label.sm>
              </Card.Header>
              <Card.Content className="p-4">
                <TextBlock className="title-h4">{bookedOutCount}</TextBlock>
              </Card.Content>
            </Card.Root>
            <Card.Root>
              <Card.Header className="gap-1.5">
                <CalendarX2Icon className="size-4" />
                <Label.sm>Overdue</Label.sm>
              </Card.Header>
              <Card.Content className="p-4">
                <TextBlock className="title-h4">{overdueItems.length}</TextBlock>
              </Card.Content>
            </Card.Root>
          </div>

          <div className="flex flex-col gap-4 p-4 pt-8 mx-auto w-full max-w-content">

            <Drawer.Root open={!!selectedEquipment} onOpenChange={handleOpenChange}>
              <Card.Root>
                <Card.Header className="gap-2">
                  <div className="flex items-center gap-2">
                    <CircleAlert className="size-4 text-tertiary" />
                    <Label.md>Overdue Equipment</Label.md>
                  </div>
                  <div className="ml-auto flex items-center gap-1">
                    <Input icon={<Search />} placeholder="Search equipment..." className="w-full max-w-sm" value={state.search} onChange={(e) => setSearch(e.target.value)} />
                    <Drawer.Root>
                      <Drawer.Trigger>
                        <Button icon={<Settings2 />} variant="secondary">Filter</Button>
                      </Drawer.Trigger>
                      <EquipmentFilterDrawer filters={equipmentFilters} />
                    </Drawer.Root>
                  </div>
                </Card.Header>
                <Card.Content className="!border-secondary overflow-hidden">
                  {(isLoadingEquipment || isLoadingBookings) ? (
                    <div className="flex justify-center py-8"><Spinner /></div>
                  ) : (
                    <DataTable
                      data={overdueItems}
                      columns={overdueColumns}
                      emptyMessage="No overdue equipment"
                      onRowClick={handleOverdueRowClick}
                    />
                  )}
                </Card.Content>
              </Card.Root>
              <Card.Root>
                <Card.Header className="gap-2">
                  <div className="flex items-center gap-2">
                    <Wrench className="size-4 text-tertiary" />
                    <Label.md>Faulty Equipment</Label.md>
                  </div>
                </Card.Header>
                <Card.Content className="!border-secondary overflow-hidden">
                  {(isLoadingEquipment || isLoadingBookings) ? (
                    <div className="flex justify-center py-8"><Spinner /></div>
                  ) : (
                    <DataTable
                      data={faultyItems}
                      columns={faultyColumns}
                      emptyMessage="No faulty equipment"
                      onRowClick={handleFaultyRowClick}
                    />
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
