import { Button } from "@moc/ui/components/controls/button";
import { Input } from "@moc/ui/components/form/input";
import { Header } from "@moc/ui/components/display/header";
import { Drawer } from "@moc/ui/components/overlays/drawer";
import { SegmentedControl } from "@moc/ui/components/controls/segmented-control";
import { Paragraph, Title } from "@moc/ui/components/display/text";
import { CalendarDays, ClipboardList, List, Search, Settings2, Table as TableIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useEquipment } from "@/features/equipment/equipment-provider";
import { useBookingFilters } from "@/features/equipment/use-booking-filters";
import { BookingFilterDrawer } from "@/features/equipment/booking-filter-drawer";
import { BookingListView } from "@/features/equipment/booking-list";
import { BookingTableView } from "@/features/equipment/booking-table";
import { BookingCalendarView } from "@/features/equipment/booking-calendar";
import { useIsMobile } from "@moc/ui/hooks/use-is-mobile";
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner";
import { Decision } from "@moc/ui/components/display/decision";
import { EmptyState } from "@moc/ui/components/feedback/empty-state";

export function EquipmentBookingsScreen() {
  const {
    state: { bookings, isLoadingBookings },
    actions: { loadBookings, loadEquipment },
  } = useEquipment();

  useEffect(() => {
    loadBookings();
    loadEquipment();
  }, [loadBookings, loadEquipment]);

  const [view, setView] = useState("list");
  const isMobile = useIsMobile()

  const bookingFilters = useBookingFilters(bookings);
  const { filtered, setSearch, filters: state } = bookingFilters;

  return (
    <section>
      <Header className="p-4 pt-8 mx-auto max-w-content">
        <Header.Lead className="gap-2">
          <Title.h6>Bookings</Title.h6>
          <Paragraph.sm className="text-tertiary max-w-2xl">
            Track equipment check-outs and returns.
          </Paragraph.sm>
        </Header.Lead>
      </Header>

      <div className="flex flex-col gap-4 p-4 mx-auto w-full max-w-content">
        <Header className="gap-2 max-mobile:flex-col *:max-mobile:w-full">
          <Header.Lead className="gap-2">
            <SegmentedControl defaultValue="list" onValueChange={(value) => setView(value)} fill={isMobile}>
              <SegmentedControl.Item value="list" icon={<List />}>List</SegmentedControl.Item>
              <SegmentedControl.Item value="table" icon={<TableIcon />}>Table</SegmentedControl.Item>
              <SegmentedControl.Item value="calendar" icon={<CalendarDays />}>Calendar</SegmentedControl.Item>
            </SegmentedControl>
          </Header.Lead>
          <Header.Trail className="gap-2 flex-1 justify-end">
            <Input icon={<Search />} placeholder="Search bookings..." className="w-full max-w-md" value={state.search} onChange={(e) => setSearch(e.target.value)} />
            <Drawer>
              <Drawer.Trigger>
                <Button icon={<Settings2 />} variant="secondary">Filter</Button>
              </Drawer.Trigger>
              <BookingFilterDrawer filters={bookingFilters} />
            </Drawer>
          </Header.Trail>
        </Header>

        <Decision value={filtered} loading={isLoadingBookings}>
          <Decision.Loading>
            <LoadingSpinner className="py-6" />
          </Decision.Loading>
          <Decision.Empty>
            <EmptyState
              icon={<ClipboardList />}
              title={state.search.trim() ? "No bookings match your search" : "No bookings yet"}
              description={state.search.trim() ? "Try a different search term or clear filters." : "Bookings appear here when equipment is checked out."}
            />
          </Decision.Empty>
          <Decision.Data>
            {view === "list" && <BookingListView bookings={filtered} />}
            {view === "table" && <BookingTableView bookings={filtered} />}
            {view === "calendar" && <BookingCalendarView bookings={filtered} />}
          </Decision.Data>
        </Decision>
      </div>
    </section>
  );
}
