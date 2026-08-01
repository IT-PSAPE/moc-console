// import { Card } from "@moc/ui/components/display/card";
import { Button } from "@moc/ui/components/controls/button";
import { Input } from "@moc/ui/components/form/input";
import { Page } from "@moc/ui/components/layout/page";
import { Drawer } from "@moc/ui/components/overlays/drawer";
import {
  Columns3,
  List,
  Package,
  Plus,
  Search,
  Settings2,
  Table as TableIcon,
} from "lucide-react";
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner";
import { Decision } from "@moc/ui/components/display/decision";
import { EmptyState } from "@moc/ui/components/feedback/empty-state";
import { EquipmentFilterDrawer } from "@/features/equipment/equipment-filter-drawer";
import { CreateEquipmentModal } from "@/features/equipment/create-equipment-modal";
import { SegmentedControl } from "@moc/ui/components/controls/segmented-control";
import { InventoryListView } from "@/features/equipment/inventory-list";
import { InventoryKanbanView } from "@/features/equipment/inventory-kanban";
import { InventoryTableView } from "@/features/equipment/inventory-table";
import { useEquipmentScreen } from "@/features/equipment/use-equipment-screen";
import type { ChangeEvent } from "react";

export function EquipmentScreen() {
  const { state, actions, meta } = useEquipmentScreen();

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    actions.setSearch(event.target.value);
  }

  return (
    <Page>
      <Page.Header>
        <Page.Heading>
          <Page.Title>Equipment</Page.Title>
        </Page.Heading>
      </Page.Header>

      <Page.Toolbar>
        <div className="w-full md:w-auto">
          <SegmentedControl value={state.activeView} onValueChange={actions.changeView} fill={state.isMobile} >
            <SegmentedControl.Item value="list" icon={<List />}>
              List
            </SegmentedControl.Item>
            <SegmentedControl.Item value="table" icon={<TableIcon />} hide={state.isMobile}>
              Table
            </SegmentedControl.Item>
            <SegmentedControl.Item value="kanban" icon={<Columns3 />} hide={state.isMobile}>
              Kanban
            </SegmentedControl.Item>
          </SegmentedControl>
        </div>
        <div className="flex flex-1 flex-wrap gap-2 md:justify-end">
          <Input
            aria-label="Search equipment"
            name="equipment-search"
            autoComplete="off"
            icon={<Search />}
            placeholder="Search equipment…"
            className="w-full max-w-md max-mobile:flex-[1_1_100%]"
            value={state.filterState.search}
            onChange={handleSearchChange}
          />
          <Drawer mobileSide="bottom">
            <Drawer.Trigger>
              {state.isMobile
                ? <Button.Icon icon={<Settings2 />} variant="secondary" aria-label="Filter" />
                : <Button icon={<Settings2 />} variant="secondary">Filter</Button>}
            </Drawer.Trigger>
            <EquipmentFilterDrawer filters={meta.filters} />
          </Drawer>
          <Button.Icon
            aria-label="Add equipment"
            variant="secondary"
            icon={<Plus />}
            onClick={actions.openCreate}
          />
        </div>
      </Page.Toolbar>

      <Page.Content>
      <Decision value={state.filtered} loading={state.isLoading}>
        <Decision.Loading>
          <LoadingSpinner className="py-6" />
        </Decision.Loading>
        <Decision.Empty>
          <EmptyState
            icon={<Package />}
            title={state.filterState.search.trim() ? "No equipment matches your search" : "No equipment yet"}
            description={state.filterState.search.trim() ? "Try a different search term or clear filters." : "Add equipment to start tracking inventory."}
          />
        </Decision.Empty>
        <Decision.Data>
          {state.activeView === "list" && <InventoryListView equipment={state.filtered} />}
          {state.activeView === "table" && <InventoryTableView equipment={state.filtered} />}
          {state.activeView === "kanban" && <InventoryKanbanView equipment={state.filtered} />}
        </Decision.Data>
      </Decision>
      </Page.Content>

      <CreateEquipmentModal
        open={state.createOpen}
        onOpenChange={actions.setCreateOpen}
        onCreate={actions.create}
      />
    </Page>
  );
}
