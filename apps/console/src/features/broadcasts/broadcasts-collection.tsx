import type { Broadcast } from "@moc/types/broadcast/broadcast"
import { Button } from "@moc/ui/components/controls/button"
import { Decision } from "@moc/ui/components/display/decision"
import { GroupedList } from "@moc/ui/components/display/grouped-list"
import { Alert } from "@moc/ui/components/feedback/alert"
import { EmptyState } from "@moc/ui/components/feedback/empty-state"
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner"
import { Input } from "@moc/ui/components/form/input"
import { CollectionToolbar } from "@moc/ui/components/layout/collection-toolbar"
import { Page } from "@moc/ui/components/layout/page"
import { SplitPanel } from "@moc/ui/components/layout/split-panel"
import { Plus, RadioTower, Search } from "lucide-react"
import type { ChangeEvent } from "react"
import { BroadcastDetailPanel } from "./broadcast-detail-panel"
import { BroadcastItem } from "./broadcast-item"
import { BroadcastModal } from "./broadcast-modal"
import { BroadcastsProvider } from "./broadcasts-provider"
import { useBroadcastsCollection } from "./use-broadcasts-collection"

function BroadcastsCollection() {
  const { state, actions, meta } = useBroadcastsCollection()

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    actions.setSearchQuery(event.target.value)
  }

  function handleDetailOpenChange(open: boolean) {
    if (!open) actions.closeDetail()
  }

  function renderBroadcast(broadcast: Broadcast) {
    return <BroadcastItem key={broadcast.id} broadcast={broadcast} onSelect={actions.selectBroadcast} />
  }

  return (
    <SplitPanel open={state.detailOpen} onOpenChange={handleDetailOpenChange} detailLabel="Broadcast details">
      <SplitPanel.Primary>
        <Page>
          <Page.Header>
            <Page.Heading>
              <Page.Title>Broadcast</Page.Title>
              <Page.Description>Public audio and video playlists. Players pick up edits as you save them.</Page.Description>
            </Page.Heading>
          </Page.Header>

          <CollectionToolbar>
            <CollectionToolbar.Actions>
              <Input
                aria-label="Search broadcasts"
                name="broadcast-search"
                autoComplete="off"
                icon={<Search />}
                placeholder="Search broadcasts…"
                className="w-full max-w-md"
                value={state.searchQuery}
                onChange={handleSearchChange}
              />
              {meta.canCreate ? (
                <Button.Icon aria-label="Create broadcast" variant="secondary" icon={<Plus />} onClick={actions.openCreate} />
              ) : null}
            </CollectionToolbar.Actions>
          </CollectionToolbar>

          <Page.Content className="flex flex-col gap-4">
            {state.loadError ? (
              <Alert
                variant="error"
                title="Could not load broadcasts"
                description={state.loadError.message}
                action={<Button variant="secondary" onClick={actions.retry}>Retry</Button>}
              />
            ) : null}
            <Decision value={meta.filtered} loading={state.isLoading}>
              <Decision.Loading>
                <LoadingSpinner className="py-6" />
              </Decision.Loading>
              <Decision.Empty>
                <EmptyState
                  icon={<RadioTower />}
                  title={meta.isFiltered ? "No broadcasts match your search" : "No broadcasts yet"}
                  description={meta.isFiltered ? "Try a different title or file name." : "Create a playlist to give listeners a public player link."}
                />
              </Decision.Empty>
              <Decision.Data>
                <GroupedList>
                  <GroupedList.Group>
                    <GroupedList.Content>{meta.filtered.map(renderBroadcast)}</GroupedList.Content>
                  </GroupedList.Group>
                </GroupedList>
              </Decision.Data>
            </Decision>
          </Page.Content>

          <BroadcastModal
            broadcast={state.editingBroadcast}
            open={state.editorOpen}
            onOpenChange={actions.setEditorOpen}
            onSubmit={actions.submitEditor}
          />
        </Page>
      </SplitPanel.Primary>
      <SplitPanel.ResizeHandle />
      <SplitPanel.Detail>
        {state.selectedBroadcast ? (
          <BroadcastDetailPanel broadcast={state.selectedBroadcast} canEdit={meta.canEdit} onEdit={actions.openEdit} />
        ) : null}
      </SplitPanel.Detail>
    </SplitPanel>
  )
}

export const Broadcasts = { Collection: BroadcastsCollection, Root: BroadcastsProvider }
