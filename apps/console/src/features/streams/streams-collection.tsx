import type { ChangeEvent } from "react"
import { Button } from "@moc/ui/components/controls/button"
import { Decision } from "@moc/ui/components/display/decision"
import { Notification } from "@moc/ui/components/feedback/notification"
import { RetryNotification } from "@moc/ui/components/feedback/retry-notification"
import { EmptyState } from "@moc/ui/components/feedback/empty-state"
import { Input } from "@moc/ui/components/form/input"
import { CollectionToolbar } from "@moc/ui/components/layout/collection-toolbar"
import { Page } from "@moc/ui/components/layout/page"
import { Drawer } from "@moc/ui/components/overlays/drawer"
import { Plus, RadioTower, RefreshCw, Search } from "lucide-react"
import { CreateStreamModal } from "./create-stream-modal"
import { MeetingModal } from "./meeting-modal"
import { StreamFilterDrawer } from "./stream-filter-drawer"
import { StreamListDetail } from "./stream-list-detail"
import { StreamModal } from "./stream-modal"
import { StreamProviderIcon } from "./stream-provider-icon"
import { StreamsList } from "./streams-list"
import { useStreamsCollection } from "./use-streams-collection"
import { ZoomMeetingFilterDrawer } from "./zoom-meeting-filter-drawer"
import { providerFailureTitle } from "@/lib/provider-request-error"

export function StreamsCollection() {
  const { state, actions, meta } = useStreamsCollection()
  const { youtube, zoom } = meta
  const filtered = state.searchQuery.trim().length > 0 || meta.hasActiveFilters
  const collectionState = meta.isConnected ? meta.listEntries : null

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    actions.setSearchQuery(event.target.value)
  }

  function handleSync() {
    void actions.syncConnected()
  }

  function handleRetryYouTubeLoad() {
    void youtube.actions.retryLoad()
  }

  function handleRetryZoomLoad() {
    void zoom.actions.retryLoad()
  }

  function handleRetryLoadErrors() {
    if (youtube.state.loadError) handleRetryYouTubeLoad()
    if (zoom.state.loadError) handleRetryZoomLoad()
  }

  function handleRetryYouTubeSync() {
    void youtube.actions.sync()
  }

  function handleRetryZoomSync() {
    void zoom.actions.sync()
  }

  if (meta.isInitialLoading) return <Page.Loading />

  return (
    <Page>
      <Page.Header>
        <Page.Heading>
          <Page.Title>Streams</Page.Title>
        </Page.Heading>
        <Page.Controls>
          <Input
            aria-label="Search streams and meetings"
            name="stream-search"
            autoComplete="off"
            icon={<Search />}
            placeholder="Search streams and meetings…"
            value={state.searchQuery}
            onChange={handleSearchChange}
          />
          {youtube.meta.isConnected ? (
            <CollectionToolbar.ActionButton icon={<StreamProviderIcon provider="youtube" decorative />} variant="secondary" aria-label="Filter YouTube streams" onClick={youtube.actions.openFilters}>
              YouTube filters
            </CollectionToolbar.ActionButton>
          ) : null}
          {zoom.meta.isConnected ? (
            <CollectionToolbar.ActionButton icon={<StreamProviderIcon provider="zoom" decorative />} variant="secondary" aria-label="Filter Zoom meetings" onClick={zoom.actions.openFilters}>
              Zoom filters
            </CollectionToolbar.ActionButton>
          ) : null}
          {meta.isConnected ? (
            <Button.Icon aria-label="Sync streams" variant="secondary" icon={<RefreshCw />} onClick={handleSync} disabled={meta.isSyncing || !meta.canSync} />
          ) : null}
          {meta.canCreate ? (
            <Button.Icon aria-label="Create stream" variant="secondary" icon={<Plus />} onClick={actions.openCreate} />
          ) : null}
        </Page.Controls>
      </Page.Header>

      <Page.Content className="flex flex-col gap-4">
        {youtube.meta.isConnected && youtube.meta.needsReauth ? (
          <Notification
            variant="error"
            title="YouTube disconnected"
            description="Reconnect YouTube in Settings to resume syncing, creating, and editing streams."
            action={<Button variant="secondary" onClick={youtube.actions.openSettings}>Open settings</Button>}
          />
        ) : null}
        {zoom.meta.isConnected && zoom.meta.needsReauth ? (
          <Notification
            variant="error"
            title="Zoom disconnected"
            description="Reconnect Zoom in Settings to resume syncing, scheduling, and editing meetings."
            action={<Button variant="secondary" onClick={zoom.actions.openSettings}>Open settings</Button>}
          />
        ) : null}
        {youtube.state.loadError ? (
          <RetryNotification title="Could not load YouTube streams" description={youtube.state.loadError} onRetry={handleRetryYouTubeLoad} isRetrying={youtube.meta.isLoading} />
        ) : null}
        {zoom.state.loadError ? (
          <RetryNotification title="Could not load Zoom meetings" description={zoom.state.loadError} onRetry={handleRetryZoomLoad} isRetrying={zoom.meta.isLoading} />
        ) : null}
        {youtube.state.syncError && !youtube.meta.needsReauth ? (
          <RetryNotification title={providerFailureTitle("YouTube", youtube.meta.providerFailure, "YouTube sync failed")} description={youtube.state.syncError} onRetry={handleRetryYouTubeSync} retryLabel="Retry sync" isRetrying={youtube.state.isSyncing} />
        ) : null}
        {zoom.state.syncError && !zoom.meta.needsReauth ? (
          <RetryNotification title={providerFailureTitle("Zoom", zoom.meta.providerFailure, "Zoom sync failed")} description={zoom.state.syncError} onRetry={handleRetryZoomSync} retryLabel="Retry sync" isRetrying={zoom.state.isSyncing} />
        ) : null}
        <Decision value={meta.isConnected ? collectionState : null}>
          <Decision.Empty>
            {meta.isConnected ? (
              youtube.state.loadError || zoom.state.loadError ? (
                <EmptyState
                  icon={<RadioTower />}
                  title="Streams couldn't be loaded"
                  description="The stream list is unavailable until the connected services finish loading."
                  action={<Button variant="secondary" onClick={handleRetryLoadErrors}>Retry</Button>}
                />
              ) : (
                <EmptyState
                  icon={<RadioTower />}
                  title={filtered ? "No streams match your filters" : "No streams scheduled"}
                  description={filtered ? "Try a different search term or clear the provider filters." : "Create a YouTube stream or Zoom meeting to get started."}
                />
              )
            ) : (
              <EmptyState
                icon={<RadioTower />}
                title="Connect a streaming service"
                description="Connect YouTube or Zoom in Settings to view and schedule streams."
                action={<Button variant="secondary" onClick={youtube.actions.openSettings}>Open settings</Button>}
              />
            )}
          </Decision.Empty>
          <Decision.Data>
            <StreamsList entries={meta.listEntries} onSelectStream={actions.selectStream} onSelectMeeting={actions.selectMeeting} />
          </Decision.Data>
        </Decision>
      </Page.Content>

      <Drawer mobileSide="bottom" open={youtube.state.filterOpen} onOpenChange={youtube.actions.setFilterOpen}>
        <StreamFilterDrawer filters={youtube.meta.filters} />
      </Drawer>
      <Drawer mobileSide="bottom" open={zoom.state.filterOpen} onOpenChange={zoom.actions.setFilterOpen}>
        <ZoomMeetingFilterDrawer filters={zoom.meta.filters} />
      </Drawer>

      <CreateStreamModal
        open={state.createOpen}
        onOpenChange={actions.setCreateOpen}
        youtubeAvailable={meta.youtubeAvailable}
        zoomAvailable={meta.zoomAvailable}
        youtubePreset={youtube.meta.connection?.presets ?? null}
        onCreateYouTube={youtube.actions.create}
        onCreateZoom={zoom.actions.create}
      />
      <StreamModal
        open={youtube.state.modalOpen}
        onOpenChange={youtube.actions.setModalOpen}
        onSubmit={youtube.actions.update}
        stream={youtube.state.editingStream}
        preset={youtube.meta.connection?.presets ?? null}
      />
      <MeetingModal
        open={zoom.state.modalOpen}
        onOpenChange={zoom.actions.setModalOpen}
        onSubmit={zoom.actions.update}
        meeting={zoom.state.editingMeeting}
      />
    </Page>
  )
}

export const Streams = { Collection: StreamsCollection, Root: StreamListDetail.Root }
