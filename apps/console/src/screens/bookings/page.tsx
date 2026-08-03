import { Input } from "@moc/ui/components/form/input";
import { Page } from "@moc/ui/components/layout/page";
import { Drawer } from "@moc/ui/components/overlays/drawer";
import { SegmentedControl } from "@moc/ui/components/controls/segmented-control";
import { CalendarDays, ClipboardList, Columns3, List, Search, Settings2 } from "lucide-react";
import type { ChangeEvent } from "react";
import { BookingFilterDrawer } from "@/features/equipment/booking-filter-drawer";
import { BookingListView } from "@/features/equipment/booking-list";
import { BookingCalendarView } from "@/features/equipment/booking-calendar";
import { BookingKanbanView } from "@/features/equipment/booking-kanban";
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner";
import { Decision } from "@moc/ui/components/display/decision";
import { EmptyState } from "@moc/ui/components/feedback/empty-state";
import { useBookingsScreen } from "./use-bookings-screen";
import { SplitPanel } from "@moc/ui/components/layout/split-panel";
import { BookingPanelContent } from "@/features/equipment/booking-drawer";
import { CollectionToolbar } from "@moc/ui/components/layout/collection-toolbar";

export function BookingsScreen() {
  const { state, actions, meta } = useBookingsScreen();
  const { filters, activeView, isMobile } = meta;
  const CollectionContent = activeView === "kanban" ? Page.CollectionContent : Page.Content;
  const visibleBookings = activeView === "calendar" ? filters.calendarFiltered : filters.filtered;
  const collectionState = activeView === "kanban" ? activeView : visibleBookings;

  function handleSearch(event: ChangeEvent<HTMLInputElement>) {
    filters.setSearch(event.target.value);
  }

  return (
    <SplitPanel open={state.detailOpen} onOpenChange={actions.closeDetail} detailLabel="Booking details">
      <SplitPanel.Primary>
      <Page>
      <Page.Header>
        <Page.Heading>
          <Page.Title>Bookings</Page.Title>
        </Page.Heading>
      </Page.Header>

      <CollectionToolbar>
          <CollectionToolbar.Views>
            <SegmentedControl value={activeView} onValueChange={actions.changeView} fill={isMobile}>
              <CollectionToolbar.ViewItem value="list" icon={<List />}>List</CollectionToolbar.ViewItem>
              <CollectionToolbar.ViewItem value="kanban" icon={<Columns3 />} hide={isMobile}>Kanban</CollectionToolbar.ViewItem>
              <CollectionToolbar.ViewItem value="calendar" icon={<CalendarDays />}>Calendar</CollectionToolbar.ViewItem>
            </SegmentedControl>
          </CollectionToolbar.Views>
          <CollectionToolbar.Actions>
            <Input aria-label="Search bookings" name="booking-search" autoComplete="off" icon={<Search />} placeholder="Search bookings…" className="w-full max-w-md" value={filters.filters.search} onChange={handleSearch} />
            <Drawer mobileSide="bottom">
              <Drawer.Trigger>
                <CollectionToolbar.ActionButton icon={<Settings2 />} variant="secondary" aria-label="Filter bookings">Filter</CollectionToolbar.ActionButton>
              </Drawer.Trigger>
              <BookingFilterDrawer filters={filters} />
            </Drawer>
          </CollectionToolbar.Actions>
      </CollectionToolbar>

      <CollectionContent className="flex flex-col gap-4">
        <Decision value={collectionState} loading={meta.isLoading}>
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
            {activeView === "list" && <BookingListView bookings={visibleBookings} onSelect={actions.selectBooking} />}
            {activeView === "kanban" && <BookingKanbanView bookings={visibleBookings} />}
            {activeView === "calendar" && <BookingCalendarView bookings={visibleBookings} />}
          </Decision.Data>
        </Decision>
      </CollectionContent>
      </Page>
      </SplitPanel.Primary>
      <SplitPanel.Detail>
        {state.selectedBooking && <BookingPanelContent booking={state.selectedBooking} onClose={actions.closeDetail} />}
      </SplitPanel.Detail>
    </SplitPanel>
  );
}
