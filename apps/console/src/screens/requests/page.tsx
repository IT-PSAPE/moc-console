import { RequestCalendarView } from "@/features/requests/request-calendar";
import { RequestKanbanView } from "@/features/requests/request-kanban";
import { RequestListView } from "@/features/requests/request-list";
import { RequestTableView } from "@/features/requests/request-table";
import { Button } from "@moc/ui/components/controls/button";
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
  Table as TableIcon,
} from "lucide-react";
import type { ChangeEvent } from "react";
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner";
import { EmptyState } from "@moc/ui/components/feedback/empty-state";
import { Drawer } from "@moc/ui/components/overlays/drawer";
import { RequestFilterDrawer } from "@/features/requests/request-filter-drawer";
import { Decision } from "@moc/ui/components/display/decision";
import { useRequestsScreen } from "./use-requests-screen";

export function RequestsScreen() {
  const { actions, meta } = useRequestsScreen();
  const { filters, activeView, isMobile } = meta;
  const CollectionContent = activeView === "table" || activeView === "kanban" ? Page.CollectionContent : Page.Content;

  function handleSearch(event: ChangeEvent<HTMLInputElement>) {
    filters.setSearch(event.target.value)
  }

  return (
    <Page>
      <Page.Header>
        <Page.Heading>
          <Page.Title>Requests</Page.Title>
        </Page.Heading>
      </Page.Header>

      <Page.Toolbar>
        <div className="w-full md:w-auto">
          <SegmentedControl value={activeView} onValueChange={actions.changeView} fill={isMobile} >
            <SegmentedControl.Item value="list" icon={<List />}>List</SegmentedControl.Item>
            <SegmentedControl.Item value="table" icon={<TableIcon />} hide={isMobile}>Table</SegmentedControl.Item>
            <SegmentedControl.Item value="kanban" icon={<Columns3 />} hide={isMobile}>Kanban</SegmentedControl.Item>
            <SegmentedControl.Item value="calendar" icon={<CalendarDays />}>Calendar</SegmentedControl.Item>
          </SegmentedControl>
        </div>
        <div className="flex flex-1 gap-2 md:justify-end">
          <Input aria-label="Search requests" name="request-search" autoComplete="off" icon={<Search />} placeholder="Search requests…" className="w-full max-w-md" value={filters.filters.search} onChange={handleSearch} />
          <Drawer mobileSide="bottom">
            <Drawer.Trigger>
              {isMobile
                ? <Button.Icon icon={<Settings2 />} variant="secondary" aria-label="Filter" />
                : <Button icon={<Settings2 />} variant="secondary">Filter</Button>}
            </Drawer.Trigger>
            <RequestFilterDrawer filters={filters} />
          </Drawer>
        </div>
      </Page.Toolbar>

      <CollectionContent>
      <Decision value={filters.filtered} loading={meta.isLoading}>
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
          {activeView === "list" && <RequestListView requests={filters.filtered} />}
          {activeView === "table" && <RequestTableView requests={filters.filtered} />}
          {activeView === "kanban" && <RequestKanbanView requests={filters.filtered} />}
          {activeView === "calendar" && <RequestCalendarView requests={filters.filtered} />}
        </Decision.Data>
      </Decision>
      </CollectionContent>
    </Page>
  );
}
