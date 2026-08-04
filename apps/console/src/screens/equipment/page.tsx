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
} from "lucide-react";
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner";
import { Decision } from "@moc/ui/components/display/decision";
import { EmptyState } from "@moc/ui/components/feedback/empty-state";
import { EquipmentFilterDrawer } from "@/features/equipment/equipment-filter-drawer";
import { CreateEquipmentModal } from "@/features/equipment/create-equipment-modal";
import { SegmentedControl } from "@moc/ui/components/controls/segmented-control";
import { InventoryListView } from "@/features/equipment/inventory-list";
import { InventoryKanbanView } from "@/features/equipment/inventory-kanban";
import { useEquipmentScreen } from "@/features/equipment/use-equipment-screen";
import type { ChangeEvent } from "react";
import { SplitPanel } from "@moc/ui/components/layout/split-panel";
import { EquipmentPanelContent } from "@/features/equipment/equipment-drawer";
import { CollectionToolbar } from "@moc/ui/components/layout/collection-toolbar";

export function EquipmentScreen() {
  const { state, actions, meta } = useEquipmentScreen();
  const CollectionContent = state.activeView === "kanban" ? Page.CollectionContent : Page.Content;
  const collectionState = state.activeView === "kanban" ? state.activeView : state.filtered;

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    actions.setSearch(event.target.value);
  }

  return (
    <SplitPanel open={state.detailOpen} onOpenChange={actions.closeDetail} detailLabel="Equipment details">
      <SplitPanel.Primary>
      <Page>
      <Page.Header>
        <Page.Heading>
          <Page.Title>Equipment</Page.Title>
        </Page.Heading>
      </Page.Header>

      <CollectionToolbar>
        <CollectionToolbar.Views>
          <SegmentedControl value={state.activeView} onValueChange={actions.changeView} fill={state.isMobile} >
            <CollectionToolbar.ViewItem value="list" icon={<List />}>List</CollectionToolbar.ViewItem>
            <CollectionToolbar.ViewItem value="kanban" icon={<Columns3 />} hide={state.isMobile}>Kanban</CollectionToolbar.ViewItem>
          </SegmentedControl>
        </CollectionToolbar.Views>
        <CollectionToolbar.Actions>
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
              <CollectionToolbar.ActionButton icon={<Settings2 />} variant="secondary" aria-label="Filter equipment">Filter</CollectionToolbar.ActionButton>
            </Drawer.Trigger>
            <EquipmentFilterDrawer filters={meta.filters} />
          </Drawer>
          <Button.Icon
            aria-label="Add equipment"
            variant="secondary"
            icon={<Plus />}
            onClick={actions.openCreate}
          />
        </CollectionToolbar.Actions>
      </CollectionToolbar>

      <CollectionContent>
      <Decision value={collectionState} loading={state.isLoading}>
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
          {state.activeView === "list" && <InventoryListView equipment={state.filtered} onSelect={actions.selectEquipment} />}
          {state.activeView === "kanban" && <InventoryKanbanView equipment={state.filtered} />}
        </Decision.Data>
      </Decision>
      </CollectionContent>

      <CreateEquipmentModal
        open={state.createOpen}
        onOpenChange={actions.setCreateOpen}
        onCreate={actions.create}
      />
      </Page>
      </SplitPanel.Primary>
      <SplitPanel.ResizeHandle />
      <SplitPanel.Detail>
        {state.selectedEquipment && <EquipmentPanelContent equipment={state.selectedEquipment} open={state.detailOpen} onClose={actions.closeDetail} />}
      </SplitPanel.Detail>
    </SplitPanel>
  );
}
