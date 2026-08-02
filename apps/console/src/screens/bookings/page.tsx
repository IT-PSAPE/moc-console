import { Button } from "@moc/ui/components/controls/button";
import { Input } from "@moc/ui/components/form/input";
import { Page } from "@moc/ui/components/layout/page";
import { Drawer } from "@moc/ui/components/overlays/drawer";
import { SegmentedControl } from "@moc/ui/components/controls/segmented-control";
import { CalendarDays, ClipboardList, List, Search, Settings2, Table as TableIcon } from "lucide-react";
import type { ChangeEvent } from "react";
import { BookingFilterDrawer } from "@/features/equipment/booking-filter-drawer";
import { BookingListView } from "@/features/equipment/booking-list";
import { BookingTableView } from "@/features/equipment/booking-table";
import { BookingCalendarView } from "@/features/equipment/booking-calendar";
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner";
import { Decision } from "@moc/ui/components/display/decision";
import { EmptyState } from "@moc/ui/components/feedback/empty-state";
import { useBookingsScreen } from "./use-bookings-screen";

export function BookingsScreen() {
  const { actions, meta } = useBookingsScreen();
  const { filters, activeView, isMobile } = meta;
  const CollectionContent = activeView === "table" ? Page.CollectionContent : Page.Content;

  function handleSearch(event: ChangeEvent<HTMLInputElement>) {
    filters.setSearch(event.target.value);
  }

  return (
    <Page>
      <Page.Header>
        <Page.Heading>
          <Page.Title>Bookings</Page.Title>
        </Page.Heading>
      </Page.Header>

      <Page.Toolbar>
          <div className="w-full md:w-auto">
            <SegmentedControl value={activeView} onValueChange={actions.changeView} fill={isMobile}>
              <SegmentedControl.Item value="list" icon={<List />}>List</SegmentedControl.Item>
              <SegmentedControl.Item value="table" icon={<TableIcon />} hide={isMobile}>Table</SegmentedControl.Item>
              <SegmentedControl.Item value="calendar" icon={<CalendarDays />}>Calendar</SegmentedControl.Item>
            </SegmentedControl>
          </div>
          <div className="flex flex-1 gap-2 md:justify-end">
            <Input aria-label="Search bookings" name="booking-search" autoComplete="off" icon={<Search />} placeholder="Search bookings…" className="w-full max-w-md" value={filters.filters.search} onChange={handleSearch} />
            <Drawer mobileSide="bottom">
              <Drawer.Trigger>
                {isMobile
                  ? <Button.Icon icon={<Settings2 />} variant="secondary" aria-label="Filter" />
                  : <Button icon={<Settings2 />} variant="secondary">Filter</Button>}
              </Drawer.Trigger>
              <BookingFilterDrawer filters={filters} />
            </Drawer>
          </div>
      </Page.Toolbar>

      <CollectionContent className="flex flex-col gap-4">
        <Decision value={filters.filtered} loading={meta.isLoading}>
          <Decision.Loading>
            <LoadingSpinner className="py-6" />
          </Decision.Loading>
          <Decision.Empty>
            <EmptyState
              icon={<ClipboardList />}
              title={filters.filters.search.trim() ? "No bookings match your search" : "No bookings yet"}
              description={filters.filters.search.trim() ? "Try a different search term or clear filters." : "Bookings appear here when equipment is checked out."}
            />
          </Decision.Empty>
          <Decision.Data>
            {activeView === "list" && <BookingListView bookings={filters.filtered} />}
            {activeView === "table" && <BookingTableView bookings={filters.filtered} />}
            {activeView === "calendar" && <BookingCalendarView bookings={filters.filtered} />}
          </Decision.Data>
        </Decision>
      </CollectionContent>
    </Page>
  );
}
