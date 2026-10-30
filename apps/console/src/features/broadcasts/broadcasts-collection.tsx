import type { Broadcast } from "@moc/types/broadcast/broadcast"
import { Button } from "@moc/ui/components/controls/button"
import { Decision } from "@moc/ui/components/display/decision"
import { GroupedList } from "@moc/ui/components/display/grouped-list"
import { RetryNotification } from "@moc/ui/components/feedback/retry-notification"
import { EmptyState } from "@moc/ui/components/feedback/empty-state"
import { Input } from "@moc/ui/components/form/input"
import { Page } from "@moc/ui/components/layout/page"
import { SplitPanel } from "@moc/ui/components/layout/split-panel"
import { ConfirmationDialog } from "@moc/ui/components/overlays/confirmation-dialog"
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

  function handleDeleteOpenChange(open: boolean) {
    actions.setDeleteOpen(open)
  }

  function renderBroadcast(broadcast: Broadcast) {
    return <BroadcastItem key={broadcast.id} broadcast={broadcast} onSelect={actions.selectBroadcast} />
  }

  if (state.isInitialLoadingBroadcasts) return <Page.Loading />

  return (
    <SplitPanel open={state.detailOpen} onOpenChange={handleDetailOpenChange} detailLabel="Broadcast details">
      <SplitPanel.Primary>
        <Page>
          <Page.Header>
            <Page.Heading>
              <Page.Title>Broadcast</Page.Title>
            </Page.Heading>
            <Page.Controls>
              <Input
                aria-label="Search broadcasts"
                name="broadcast-search"
                autoComplete="off"
                icon={<Search />}
                placeholder="Search broadcasts…"
                value={state.searchQuery}
                onChange={handleSearchChange}
              />
              {meta.canCreate ? (
                <Button.Icon aria-label="Create broadcast" variant="secondary" icon={<Plus />} onClick={actions.openCreate} />
              ) : null}
            </Page.Controls>
          </Page.Header>

          <Page.Content className="flex flex-col gap-4">
            {state.loadError ? (
              <RetryNotification
                title="Could not load broadcasts"
                description={state.loadError.message}
                onRetry={actions.retry}
                isRetrying={state.isLoading}
              />
            ) : null}
            <Decision value={meta.filtered}>
              <Decision.Empty>
                {state.loadError ? (
                  <EmptyState
                    icon={<RadioTower />}
                    title="Broadcasts couldn't be loaded"
                    description={state.loadError.message}
                    action={<Button variant="secondary" onClick={actions.retry} disabled={state.isLoading}>Retry</Button>}
                  />
                ) : (
                  <EmptyState
                    icon={<RadioTower />}
                    title={meta.isFiltered ? "No broadcasts match your search" : "No broadcasts yet"}
                    description={meta.isFiltered ? "Try a different title or file name." : "Create a playlist to give listeners a public player link."}
                  />
                )}
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
            open={state.editorOpen}
            onOpenChange={actions.setEditorOpen}
            onSubmit={actions.submitEditor}
          />
          <ConfirmationDialog
            open={state.deleteTarget !== null}
            onOpenChange={handleDeleteOpenChange}
            title="Delete broadcast?"
            description="This permanently deletes the playlist and all of its uploaded files. This can't be undone."
            confirmLabel="Delete broadcast"
            isConfirming={state.isDeleting}
            onConfirm={actions.confirmDelete}
          />
        </Page>
      </SplitPanel.Primary>
      <SplitPanel.ResizeHandle />
      <SplitPanel.Detail>
        {state.selectedBroadcast ? (
          <BroadcastDetailPanel key={state.selectedBroadcast.id} broadcast={state.selectedBroadcast} canDelete={meta.canDelete} onDelete={actions.openDelete} />
        ) : null}
      </SplitPanel.Detail>
    </SplitPanel>
  )
}

export const Broadcasts = { Collection: BroadcastsCollection, Root: BroadcastsProvider }
