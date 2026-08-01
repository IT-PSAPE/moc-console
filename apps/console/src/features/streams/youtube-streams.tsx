import { Card } from "@moc/ui/components/display/card"
import { Decision } from "@moc/ui/components/display/decision"
import { Label } from "@moc/ui/components/display/text"
import { Button } from "@moc/ui/components/controls/button"
import { Alert } from "@moc/ui/components/feedback/alert"
import { EmptyState } from "@moc/ui/components/feedback/empty-state"
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner"
import { Drawer } from "@moc/ui/components/overlays/drawer"
import type { Stream } from "@moc/types/streams/stream"
import { Plus, RefreshCw, Settings2, Tv } from "lucide-react"
import { StreamDetailDrawer } from "./stream-detail-drawer"
import { StreamFilterDrawer } from "./stream-filter-drawer"
import { StreamListItem } from "./stream-list-item"
import { StreamModal } from "./stream-modal"
import { useYouTubeStreams } from "./use-youtube-streams"

export function YouTubeStreamsView({ searchQuery }: { searchQuery: string }) {
  const { state, actions, meta } = useYouTubeStreams(searchQuery)
  const { filters } = meta

  function renderStream(stream: Stream) {
    return <StreamListItem key={stream.id} stream={stream} onSelect={actions.openDetail} />
  }

  return (
    <>
      {meta.isConnected && meta.needsReauth && (
        <Alert
          variant="error"
          title="YouTube disconnected"
          description="Reconnect YouTube in Settings to resume syncing, creating, and editing streams."
          className="mb-1.5"
        />
      )}
      <Card>
        <Card.Header tight className="gap-1.5 justify-between">
          <div className="flex items-center gap-1.5">
            <Tv className="size-4" />
            <Label.sm>YouTube streams</Label.sm>
          </div>
          {meta.isConnected && (
            <div className="flex items-center gap-1">
              <Button.Icon aria-label="Filter YouTube streams" variant="ghost" icon={<Settings2 />} onClick={actions.openFilters} />
              <Button.Icon aria-label="Sync YouTube streams" variant="ghost" icon={<RefreshCw />} onClick={actions.sync} disabled={state.isSyncing || meta.needsReauth} />
              {meta.canCreate && (
                <Button.Icon aria-label="Create YouTube stream" variant="secondary" icon={<Plus />} onClick={actions.openCreate} />
              )}
            </div>
          )}
        </Card.Header>
        <Card.Content ghost className="flex flex-col gap-1.5">
          <Decision value={meta.isConnected ? filters.filtered : null} loading={meta.isLoading}>
            <Decision.Loading>
              <LoadingSpinner className="py-6" />
            </Decision.Loading>
            <Decision.Empty>
              {meta.isConnected ? (
                <EmptyState
                  icon={<Tv />}
                  title={filters.filters.search || filters.hasActiveFilters ? "No streams match your filters" : "No streams yet"}
                  description={filters.filters.search || filters.hasActiveFilters ? "Try a different search term or clear filters." : "Create a YouTube stream to broadcast live."}
                />
              ) : (
                <EmptyState
                  icon={<Tv />}
                  title="Connect YouTube"
                  description="Connect YouTube in Settings to view and create streams."
                  action={<Button variant="secondary" onClick={actions.openSettings}>Open settings</Button>}
                />
              )}
            </Decision.Empty>
            <Decision.Data>{filters.filtered.map(renderStream)}</Decision.Data>
          </Decision>
        </Card.Content>
      </Card>

      <Drawer mobileSide="bottom" open={state.filterOpen} onOpenChange={actions.setFilterOpen}>
        <StreamFilterDrawer filters={filters} />
      </Drawer>

      <StreamModal
        open={state.modalOpen}
        onOpenChange={actions.setModalOpen}
        onSubmit={state.editingStream ? actions.update : actions.create}
        stream={state.editingStream}
        preset={meta.connection?.presets ?? null}
      />
      <StreamDetailDrawer
        stream={state.drawerStream}
        open={state.drawerOpen}
        onOpenChange={actions.setDrawerOpen}
        onEdit={actions.edit}
        onDelete={actions.remove}
      />
    </>
  )
}
