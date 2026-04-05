import { Card } from "@/components/display/card";
import { Button } from "@/components/controls/button";
import { Input } from "@/components/form/input";
import { Header } from "@/components/display/header";
import { Drawer } from "@/components/overlays/drawer";
import { Badge } from "@/components/display/badge";
import { SegmentedControl } from "@/components/controls/segmented-control";
import { Paragraph, Title } from "@/components/display/text";
import { CalendarDays, List, Search, Settings2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Decision } from "@/components/display/decision";
import { Spinner } from "@/components/feedback/spinner";
import { EmptyState } from "@/components/feedback/empty-state";
import { DataTable } from "@/components/display/data-table";
import { useEquipment } from "@/features/equipment/equipment-provider";
import { EquipmentDrawer } from "@/features/equipment/equipment-drawer";
import { useBookingFilters } from "@/features/equipment/use-booking-filters";
import { BookingFilterDrawer } from "@/features/equipment/booking-filter-drawer";
import { BookingCalendar } from "@/features/equipment/booking-calendar";
import { bookingStatusLabel, bookingStatusColor } from "@/types/equipment";
import type { Booking, Equipment } from "@/types/equipment";

const columns = [
  { key: "equipmentName", header: "Equipment" },
  { key: "bookedBy", header: "Booked By" },
  {
    key: "status",
    header: "Status",
    render: (_: unknown, row: Booking) => (
      <Badge label={bookingStatusLabel[row.status]} color={bookingStatusColor[row.status]} />
    ),
  },
  {
    key: "checkedOutDate",
    header: "Checked Out",
    render: (value: unknown) => new Date(value as string).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }),
  },
  {
    key: "returnedDate",
    header: "Returned",
    render: (value: unknown) =>
      value ? new Date(value as string).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" }) : <span className="text-quaternary">—</span>,
  },
  { key: "duration", header: "Duration" },
  {
    key: "notes",
    header: "Notes",
    render: (value: unknown) => (value as string) || <span className="text-quaternary">—</span>,
  },
];

export function EquipmentBookingsScreen() {
  const {
    state: { bookings, isLoadingBookings, equipment, isLoadingEquipment },
    actions: { loadBookings, loadEquipment },
  } = useEquipment();

  useEffect(() => {
    loadBookings();
    loadEquipment();
  }, [loadBookings, loadEquipment]);

  const [view, setView] = useState("table");
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

  const bookingFilters = useBookingFilters(bookings);
  const { filtered, setSearch, filters: state } = bookingFilters;

  const equipmentMap = useMemo(() => {
    const map = new Map<string, Equipment>();
    for (const e of equipment) map.set(e.id, e);
    return map;
  }, [equipment]);

  function handleBookingRowClick(_: Booking, index: number) {
    const booking = filtered[index];
    const eq = equipmentMap.get(booking.equipmentId);
    if (eq) setSelectedEquipment(eq);
  }

  const isLoading = isLoadingBookings || isLoadingEquipment;

  return (
    <section>
      <Header.Root className="p-4 pt-8 mx-auto max-w-content">
        <Header.Lead className="gap-2">
          <Title.h6>Bookings</Title.h6>
          <Paragraph.sm className="text-tertiary max-w-2xl">
            Track equipment check-outs and returns.
          </Paragraph.sm>
        </Header.Lead>
      </Header.Root>

      <div className="flex flex-col gap-4 p-4 mx-auto w-full max-w-content">
        <Header.Root className="gap-2 max-mobile:flex-col *:max-mobile:w-full">
          <Header.Lead className="gap-2">
            <SegmentedControl.Root defaultValue="table" onValueChange={(value) => setView(value)}>
              <SegmentedControl.Item value="table" icon={<List />}>Table</SegmentedControl.Item>
              <SegmentedControl.Item value="calendar" icon={<CalendarDays />}>Calendar</SegmentedControl.Item>
            </SegmentedControl.Root>
          </Header.Lead>
          <Header.Trail className="gap-2 flex-1 justify-end">
            <Input icon={<Search />} placeholder="Search bookings..." className="w-full max-w-sm" value={state.search} onChange={(e) => setSearch(e.target.value)} />
            <Drawer.Root>
              <Drawer.Trigger>
                <Button icon={<Settings2 />} variant="secondary">Filter</Button>
              </Drawer.Trigger>
              <BookingFilterDrawer filters={bookingFilters} />
            </Drawer.Root>
          </Header.Trail>
        </Header.Root>

        <Decision.Root value={filtered} loading={isLoading}>
          <Decision.Loading>
            <div className="flex justify-center py-16">
              <Spinner size="lg" />
            </div>
          </Decision.Loading>
          <Decision.Empty>
            <EmptyState icon={<CalendarDays />} title="No bookings found" description="No equipment bookings match your current filters." />
          </Decision.Empty>
          <Decision.Data>
            {() => (
              <>
                {view === "table" && (
                  <Drawer.Root open={!!selectedEquipment} onOpenChange={handleOpenChange}>
                    <Card.Root>
                      <Card.Content className="!border-secondary overflow-hidden">
                          <DataTable data={filtered} columns={columns} emptyMessage="No bookings found" onRowClick={handleBookingRowClick} />
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
                )}
                {view === "calendar" && (
                  <BookingCalendar bookings={filtered} equipmentMap={equipmentMap} />
                )}
              </>
            )}
          </Decision.Data>
        </Decision.Root>
      </div>
    </section>
  );
}
