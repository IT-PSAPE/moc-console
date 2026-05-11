import { RequestCalendarView } from "@/features/requests/request-calendar";
import { RequestKanbanView } from "@/features/requests/request-kanban";
import { RequestListView } from "@/features/requests/request-list";
import { RequestTableView } from "@/features/requests/request-table";
import { Button } from "@/components/controls/button";
import { SegmentedControl } from "@/components/controls/segmented-control";
import { Header } from "@/components/display/header";
import { Paragraph, Title } from "@/components/display/text";
import { Input } from "@/components/form/input";
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
import { LoadingSpinner } from "@/components/feedback/spinner";
import { EmptyState } from "@/components/feedback/empty-state";
import { Drawer } from "@/components/overlays/drawer";
import { RequestFilterDrawer } from "@/features/requests/request-filter-drawer";
import { useRequestFilters } from "@/features/requests/use-request-filters";
import { useRequests } from "@/features/requests/request-provider";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { Decision } from "@/components/display/decision";

export function RequestsAllRequestsScreen() {
  const [view, setView] = useState("list");
  const isMobile = useIsMobile();
  const {
    state: { activeRequests: requests, isLoadingActive },
    actions: { loadActiveRequests },
  } = useRequests();

  useEffect(() => {
    loadActiveRequests();
  }, [loadActiveRequests]);

  const requestFilters = useRequestFilters(requests);
  const { filtered, setSearch, filters: state } = requestFilters;

  function onSearch(e: React.ChangeEvent<HTMLInputElement, HTMLInputElement>) {
    setSearch(e.target.value)
  }

  return (
    <section>
      <Header className="p-4 pt-8 mx-auto max-w-content">
        <Header.Lead className="gap-2">
          <Title.h6>All Requests</Title.h6>
          <Paragraph.sm className="text-tertiary max-w-2xl">
            Browse, search, and filter all submitted requests across every
            status and category.
          </Paragraph.sm>
        </Header.Lead>
      </Header>

      <Header className="p-4 pt-8 mx-auto max-w-content max-mobile:flex-col max-mobile:gap-2 *:max-mobile:w-full">
        <Header.Lead className="gap-2 w-full">
          <SegmentedControl defaultValue="list" onValueChange={(value) => setView(value)} fill={isMobile} >
            <SegmentedControl.Item value="list" icon={<List />}>List</SegmentedControl.Item>
            <SegmentedControl.Item value="table" icon={<TableIcon />}>Table</SegmentedControl.Item>
            <SegmentedControl.Item value="kanban" icon={<Columns3 />}>Kanban</SegmentedControl.Item>
            <SegmentedControl.Item value="calendar" icon={<CalendarDays />}>Calendar</SegmentedControl.Item>
          </SegmentedControl>
        </Header.Lead>
        <Header.Trail className="gap-2 flex-1 justify-end ">
          <Input icon={<Search />} placeholder="Search requests..." className="w-full max-w-md" value={state.search} onChange={onSearch} />
          <Drawer>
            <Drawer.Trigger>
              <Button icon={<Settings2 />} variant="secondary">Filter</Button>
            </Drawer.Trigger>
            <RequestFilterDrawer filters={requestFilters} />
          </Drawer>
        </Header.Trail>
      </Header>

      <Decision value={filtered} loading={isLoadingActive}>
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
          {view === "list" && <RequestListView requests={filtered} />}
          {view === "table" && <RequestTableView requests={filtered} />}
          {view === "kanban" && <RequestKanbanView requests={filtered} />}
          {view === "calendar" && <RequestCalendarView requests={filtered} />}
        </Decision.Data>
      </Decision>
    </section>
  );
}
