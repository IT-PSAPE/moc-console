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
import { Spinner } from "@/components/feedback/spinner";
import { DataTable } from "@/components/display/data-table";
import { useEquipment } from "@/features/equipment/equipment-provider";
import { BookingDrawer } from "@/features/equipment/booking-drawer";
import { useBookingFilters } from "@/features/equipment/use-booking-filters";
import { BookingFilterDrawer } from "@/features/equipment/booking-filter-drawer";
import { BookingCalendar } from "@/features/equipment/booking-calendar";
import { CreateBookingModal } from "@/features/equipment/create-booking-modal";
import { bookingStatusLabel, bookingStatusColor } from "@/types/equipment";
import type { Booking, Equipment } from "@/types/equipment";
import { createBooking } from "@/data/mutate-booking";
import { fetchEquipmentById } from "@/data/fetch-equipment";
import { useFeedback } from "@/components/feedback/feedback-provider";
import { getErrorMessage } from "@/utils/get-error-message";
import { formatUtcIsoInBrowserTimeZone } from "@/utils/browser-date-time";
import { useIsMobile } from "@/hooks/use-is-mobile";

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
    render: (value: unknown) => formatUtcIsoInBrowserTimeZone(value as string),
  },
  {
    key: "expectedReturnAt",
    header: "Expected Return",
    render: (value: unknown) => formatUtcIsoInBrowserTimeZone(value as string),
  },
  {
    key: "returnedDate",
    header: "Returned",
    render: (value: unknown) =>
      value ? formatUtcIsoInBrowserTimeZone(value as string) : <span className="text-quaternary">—</span>,
  },
  {
    key: "notes",
    header: "Notes",
    render: (value: unknown) => (value as string) || <span className="text-quaternary">—</span>,
  },
];

export function EquipmentBookingsScreen() {
  const {
    state: { bookings, isLoadingBookings, equipment, isLoadingEquipment },
    actions: { loadBookings, loadEquipment, syncBooking, syncEquipment },
  } = useEquipment();
  const { toast } = useFeedback();

  useEffect(() => {
    loadBookings();
    loadEquipment();
  }, [loadBookings, loadEquipment]);

  const [view, setView] = useState("table");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const isDirtyRef = useRef(false);
  const requestCloseRef = useRef<(() => void) | null>(null);
  const isMobile = useIsMobile()

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open && isDirtyRef.current) {
      requestCloseRef.current?.();
    } else if (!open) {
      setSelectedBooking(null);
    }
  }, []);

  const handleBookingClose = useCallback(() => {
    setSelectedBooking(null);
  }, []);

  const bookingFilters = useBookingFilters(bookings);
  const { filtered, setSearch, filters: state } = bookingFilters;

  const equipmentMap = useMemo(() => {
    const map = new Map<string, Equipment>();
    for (const e of equipment) map.set(e.id, e);
    return map;
  }, [equipment]);

  function handleBookingRowClick(_: Booking, index: number) {
    setSelectedBooking(filtered[index]);
  }

  const isLoading = isLoadingBookings || isLoadingEquipment;

  const handleCreateBooking = useCallback(async (params: { equipmentId: string; equipmentName: string; bookedBy: string; checkedOutDate: string; expectedReturnAt: string; notes: string; status: Booking["status"] }) => {
    try {
      const savedBooking = await createBooking(params);
      syncBooking(savedBooking);
      const refreshedEquipment = await fetchEquipmentById(savedBooking.equipmentId);
      if (refreshedEquipment) {
        syncEquipment(refreshedEquipment);
      }
      toast({ title: "Booking created", variant: "success" });
    } catch (error) {
      const message = getErrorMessage(error, "The booking could not be created.");
      toast({ title: "Failed to create booking", description: message, variant: "error" });
      throw new Error(message);
    }
  }, [syncBooking, syncEquipment, toast]);

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
            <SegmentedControl.Root defaultValue="table" onValueChange={(value) => setView(value)} fill={isMobile}>
              <SegmentedControl.Item value="table" icon={<List />}>Table</SegmentedControl.Item>
              <SegmentedControl.Item value="calendar" icon={<CalendarDays />}>Calendar</SegmentedControl.Item>
            </SegmentedControl.Root>
          </Header.Lead>
          <Header.Trail className="gap-2 flex-1 justify-end">
            <Input icon={<Search />} placeholder="Search bookings..." className="w-full max-w-md" value={state.search} onChange={(e) => setSearch(e.target.value)} />
            <Button onClick={() => setCreateOpen(true)}>New Booking</Button>
            <Drawer.Root>
              <Drawer.Trigger>
                <Button icon={<Settings2 />} variant="secondary">Filter</Button>
              </Drawer.Trigger>
              <BookingFilterDrawer filters={bookingFilters} />
            </Drawer.Root>
          </Header.Trail>
        </Header.Root>

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : view === "table" ? (
          <Drawer.Root open={!!selectedBooking} onOpenChange={handleOpenChange}>
            <Card.Root>
              <Card.Content className="!border-secondary overflow-hidden">
                <DataTable data={filtered} columns={columns} emptyMessage="No bookings found" onRowClick={handleBookingRowClick} />
              </Card.Content>
            </Card.Root>
            {selectedBooking && (
              <BookingDrawer
                booking={selectedBooking}
                onBookingClose={handleBookingClose}
                isDirtyRef={isDirtyRef}
                requestCloseRef={requestCloseRef}
              />
            )}
          </Drawer.Root>
        ) : (
          <BookingCalendar bookings={filtered} equipmentMap={equipmentMap} />
        )}
      </div>
      <CreateBookingModal open={createOpen} onOpenChange={setCreateOpen} equipment={equipment} onCreate={handleCreateBooking} />
    </section>
  );
}
