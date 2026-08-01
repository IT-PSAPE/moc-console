import { RequestCalendarView } from "@/features/requests/request-calendar";
import { RequestKanbanView } from "@/features/requests/request-kanban";
import { RequestListView } from "@/features/requests/request-list";
import { RequestTableView } from "@/features/requests/request-table";
import { Button } from "@moc/ui/components/controls/button";
import { SegmentedControl } from "@moc/ui/components/controls/segmented-control";
import { Header } from "@moc/ui/components/display/header";
import { Paragraph, Title } from "@moc/ui/components/display/text";
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
import { useEffect, useState } from "react";
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner";
import { EmptyState } from "@moc/ui/components/feedback/empty-state";
import { Drawer } from "@moc/ui/components/overlays/drawer";
import { RequestFilterDrawer } from "@/features/requests/request-filter-drawer";
import { useRequestFilters } from "@/features/requests/use-request-filters";
import { useRequests } from "@/features/requests/request-provider";
import { useIsMobile } from "@moc/ui/hooks/use-is-mobile";
import { Decision } from "@moc/ui/components/display/decision";

export function RequestsScreen() {
  const [view, setView] = useState("list");
  const isMobile = useIsMobile();
  const activeView = isMobile && (view === "table" || view === "kanban") ? "list" : view;
  const {
    state: { allRequests, isLoadingActive, isLoadingArchived },
    actions: { loadActiveRequests, loadArchivedRequests },
  } = useRequests();

  useEffect(() => {
    loadActiveRequests();
  }, [loadActiveRequests]);

  const requestFilters = useRequestFilters(allRequests);
  const { filtered, setSearch, filters: state, includesArchived } = requestFilters;

  // Archived requests are a separate query — only pay for it once the user
  // actually ticks Archived in the filter drawer.
  useEffect(() => {
    if (includesArchived) loadArchivedRequests();
  }, [includesArchived, loadArchivedRequests]);

  function onSearch(e: React.ChangeEvent<HTMLInputElement, HTMLInputElement>) {
    setSearch(e.target.value)
  }

  function handleViewChange(value: string) {
    setView(value)
  }

  return (
    <section>
      <Header className="p-2 pt-8 mx-auto max-w-content">
        <Header.Lead className="gap-2">
          <Title.h6>Requests</Title.h6>
          <Paragraph.sm className="text-tertiary max-w-2xl">
            Browse, search, and filter every submitted request. Archived
            requests are hidden until you tick Archived in the filter.
          </Paragraph.sm>
        </Header.Lead>
      </Header>

      <Header className="p-2 pt-8 mx-auto max-w-content max-mobile:flex-col max-mobile:gap-2 *:max-mobile:w-full">
        <Header.Lead className="gap-2 w-full">
          <SegmentedControl value={activeView} onValueChange={handleViewChange} fill={isMobile} >
            <SegmentedControl.Item value="list" icon={<List />}>List</SegmentedControl.Item>
            <SegmentedControl.Item value="table" icon={<TableIcon />} hide={isMobile}>Table</SegmentedControl.Item>
            <SegmentedControl.Item value="kanban" icon={<Columns3 />} hide={isMobile}>Kanban</SegmentedControl.Item>
            <SegmentedControl.Item value="calendar" icon={<CalendarDays />}>Calendar</SegmentedControl.Item>
          </SegmentedControl>
        </Header.Lead>
        <Header.Trail className="gap-2 flex-1 justify-end ">
          <Input icon={<Search />} placeholder="Search requests..." className="w-full max-w-md" value={state.search} onChange={onSearch} />
          <Drawer>
            <Drawer.Trigger>
              {isMobile
                ? <Button.Icon icon={<Settings2 />} variant="secondary" aria-label="Filter" />
                : <Button icon={<Settings2 />} variant="secondary">Filter</Button>}
            </Drawer.Trigger>
            <RequestFilterDrawer filters={requestFilters} />
          </Drawer>
        </Header.Trail>
      </Header>

      <Decision value={filtered} loading={isLoadingActive || (includesArchived && isLoadingArchived)}>
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
          {activeView === "list" && <RequestListView requests={filtered} />}
          {activeView === "table" && <RequestTableView requests={filtered} />}
          {activeView === "kanban" && <RequestKanbanView requests={filtered} />}
          {activeView === "calendar" && <RequestCalendarView requests={filtered} />}
        </Decision.Data>
      </Decision>
    </section>
  );
}
