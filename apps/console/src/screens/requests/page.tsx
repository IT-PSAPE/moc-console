import { RequestCalendarView } from "@/features/requests/request-calendar";
import { RequestKanbanView } from "@/features/requests/request-kanban";
import { RequestListView } from "@/features/requests/request-list";
import { SegmentedControl } from "@moc/ui/components/controls/segmented-control";
import { Page } from "@moc/ui/components/layout/page";
import { Input } from "@moc/ui/components/form/input";
import {
  CalendarDays,
  Columns3,
  Inbox,
  List,
  Search,
  Settings2,
} from "lucide-react";
import type { ChangeEvent } from "react";
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner";
import { EmptyState } from "@moc/ui/components/feedback/empty-state";
import { Drawer } from "@moc/ui/components/overlays/drawer";
import { RequestFilterDrawer } from "@/features/requests/request-filter-drawer";
import { Decision } from "@moc/ui/components/display/decision";
import { useRequestsScreen } from "./use-requests-screen";
import { SplitPanel } from "@moc/ui/components/layout/split-panel";
import { RequestPanelContent } from "@/features/requests/request-drawer";
import { CollectionToolbar } from "@moc/ui/components/layout/collection-toolbar";

export function RequestsScreen() {
  const { state, actions, meta } = useRequestsScreen();
  const { filters, activeView, isMobile } = meta;
  const CollectionContent = activeView === "kanban" ? Page.CollectionContent : Page.Content;
  const visibleRequests = activeView === "calendar" ? filters.calendarFiltered : filters.filtered;
  const collectionState = activeView === "kanban" ? activeView : visibleRequests;

  function handleSearch(event: ChangeEvent<HTMLInputElement>) {
    filters.setSearch(event.target.value)
  }

  return (
    <SplitPanel open={state.detailOpen} onOpenChange={actions.closeDetail} detailLabel="Request details">
      <SplitPanel.Primary>
      <Page>
      <Page.Header>
        <Page.Heading>
          <Page.Title>Requests</Page.Title>
        </Page.Heading>
      </Page.Header>

      <CollectionToolbar>
        <CollectionToolbar.Views>
          <SegmentedControl value={activeView} onValueChange={actions.changeView} fill={isMobile} >
            <CollectionToolbar.ViewItem value="list" icon={<List />}>List</CollectionToolbar.ViewItem>
            <CollectionToolbar.ViewItem value="kanban" icon={<Columns3 />} hide={isMobile}>Kanban</CollectionToolbar.ViewItem>
            <CollectionToolbar.ViewItem value="calendar" icon={<CalendarDays />}>Calendar</CollectionToolbar.ViewItem>
          </SegmentedControl>
        </CollectionToolbar.Views>
        <CollectionToolbar.Actions>
          <Input aria-label="Search requests" name="request-search" autoComplete="off" icon={<Search />} placeholder="Search requests…" className="w-full max-w-md" value={filters.filters.search} onChange={handleSearch} />
          <Drawer mobileSide="bottom">
            <Drawer.Trigger>
              <CollectionToolbar.ActionButton icon={<Settings2 />} variant="secondary" aria-label="Filter requests">Filter</CollectionToolbar.ActionButton>
            </Drawer.Trigger>
            <RequestFilterDrawer filters={filters} />
          </Drawer>
        </CollectionToolbar.Actions>
      </CollectionToolbar>

      <CollectionContent>
      <Decision value={collectionState} loading={meta.isLoading}>
        <Decision.Loading>
          <LoadingSpinner className="py-6" />
        </Decision.Loading>
        <Decision.Empty>
          <EmptyState
            icon={<Inbox />}
            title="No requests found"
            description="No requests match your current filters, or none have been created yet."
          />
        </Decision.Empty>
        <Decision.Data>
          {activeView === "list" && <RequestListView requests={visibleRequests} onSelect={actions.selectRequest} />}
          {activeView === "kanban" && <RequestKanbanView requests={visibleRequests} />}
          {activeView === "calendar" && <RequestCalendarView requests={visibleRequests} />}
        </Decision.Data>
      </Decision>
      </CollectionContent>
      </Page>
      </SplitPanel.Primary>
      <SplitPanel.ResizeHandle />
      <SplitPanel.Detail>
        {state.selectedRequest && <RequestPanelContent request={state.selectedRequest} open={state.detailOpen} onClose={actions.closeDetail} />}
      </SplitPanel.Detail>
    </SplitPanel>
  );
}
