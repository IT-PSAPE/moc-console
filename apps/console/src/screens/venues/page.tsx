import type { ChangeEvent } from "react";
import {
  CalendarDays,
  Columns3,
  List,
  MapPin,
  Search,
  Settings2,
} from "lucide-react";
import { VenueBookingCalendarView } from "@/features/venues/venue-booking-calendar";
import { VenueBookingKanbanView } from "@/features/venues/venue-booking-kanban";
import { VenueBookingListView } from "@/features/venues/venue-booking-list";
import { VenueBookingFilterDrawer } from "@/features/venues/venue-booking-filter-drawer";
import { VenueBookingPanelContent } from "@/features/venues/venue-booking-drawer";
import { SegmentedControl } from "@moc/ui/components/controls/segmented-control";
import { Page } from "@moc/ui/components/layout/page";
import { Input } from "@moc/ui/components/form/input";
import { EmptyState } from "@moc/ui/components/feedback/empty-state";
import { Drawer } from "@moc/ui/components/overlays/drawer";
import { Decision } from "@moc/ui/components/display/decision";
import { SplitPanel } from "@moc/ui/components/layout/split-panel";
import { CollectionToolbar } from "@moc/ui/components/layout/collection-toolbar";
import { useVenueBookingsScreen } from "./use-venue-bookings-screen";
import { ResourceLoadError } from "@/components/feedback/resource-load-error";

export function VenueBookingsScreen() {
  const { state, actions, meta } = useVenueBookingsScreen();
  const { filters, activeView, isLandscape } = meta;
  const CollectionContent = activeView === "kanban" ? Page.CollectionContent : Page.Content;
  const visibleBookings = activeView === "calendar" ? filters.calendarFiltered : filters.filtered;
  const collectionState = activeView === "list" ? visibleBookings : activeView;
  if (meta.isInitialLoading) return <Page.Loading />;

  function handleSearch(event: ChangeEvent<HTMLInputElement>) {
    filters.setSearch(event.target.value)
  }

  return (
    <SplitPanel open={state.detailOpen} onOpenChange={actions.closeDetail} detailLabel="Booking details">
      <SplitPanel.Primary>
      <Page>
      <Page.Header>
        <Page.Heading>
          <Page.Title>Venues</Page.Title>
        </Page.Heading>
        <Page.Controls>
          <Input aria-label="Search venue bookings" name="venue-booking-search" autoComplete="off" icon={<Search />} placeholder="Search bookings…" value={filters.filters.search} onChange={handleSearch} />
          <Drawer mobileSide="bottom">
            <Drawer.Trigger>
              <CollectionToolbar.ActionButton icon={<Settings2 />} variant="secondary" aria-label="Filter venue bookings">Filter</CollectionToolbar.ActionButton>
            </Drawer.Trigger>
            <VenueBookingFilterDrawer filters={filters} />
          </Drawer>
        </Page.Controls>
      </Page.Header>

      <CollectionToolbar>
        <CollectionToolbar.Views>
          <SegmentedControl value={activeView} onValueChange={actions.changeView} fill={isLandscape} >
            <CollectionToolbar.ViewItem value="list" icon={<List />}>List</CollectionToolbar.ViewItem>
            <CollectionToolbar.ViewItem value="kanban" icon={<Columns3 />} hide={isLandscape}>Kanban</CollectionToolbar.ViewItem>
            <CollectionToolbar.ViewItem value="calendar" icon={<CalendarDays />}>Calendar</CollectionToolbar.ViewItem>
          </SegmentedControl>
        </CollectionToolbar.Views>
      </CollectionToolbar>

      <CollectionContent>
      {meta.error ? <ResourceLoadError title="Couldn't load venue bookings" error={meta.error} onRetry={actions.retry} /> : <Decision value={collectionState}>
        <Decision.Empty>
          <EmptyState
            icon={<MapPin />}
            title="No venue bookings found"
            description="No bookings match your current filters, or none have been submitted yet."
          />
        </Decision.Empty>
        <Decision.Data>
          {activeView === "list" && <VenueBookingListView bookings={visibleBookings} onSelect={actions.selectBooking} />}
          {activeView === "kanban" && <VenueBookingKanbanView bookings={visibleBookings} />}
          {activeView === "calendar" && <VenueBookingCalendarView bookings={visibleBookings} />}
        </Decision.Data>
      </Decision>}
      </CollectionContent>
      </Page>
      </SplitPanel.Primary>
      <SplitPanel.ResizeHandle />
      <SplitPanel.Detail>
        {state.selectedBooking && <VenueBookingPanelContent booking={state.selectedBooking} onClose={actions.closeDetail} />}
      </SplitPanel.Detail>
    </SplitPanel>
  );
}
