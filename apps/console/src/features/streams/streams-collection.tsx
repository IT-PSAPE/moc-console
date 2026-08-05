import type { ChangeEvent } from "react"
import { Button } from "@moc/ui/components/controls/button"
import { SegmentedControl } from "@moc/ui/components/controls/segmented-control"
import { Decision } from "@moc/ui/components/display/decision"
import { Alert } from "@moc/ui/components/feedback/alert"
import { EmptyState } from "@moc/ui/components/feedback/empty-state"
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner"
import { Input } from "@moc/ui/components/form/input"
import { CollectionToolbar } from "@moc/ui/components/layout/collection-toolbar"
import { Page } from "@moc/ui/components/layout/page"
import { Drawer } from "@moc/ui/components/overlays/drawer"
import { CalendarDays, List, Plus, RadioTower, RefreshCw, Search } from "lucide-react"
import { CreateStreamModal } from "./create-stream-modal"
import { MeetingModal } from "./meeting-modal"
import { StreamFilterDrawer } from "./stream-filter-drawer"
import { StreamListDetail } from "./stream-list-detail"
import { StreamModal } from "./stream-modal"
import { StreamProviderIcon } from "./stream-provider-icon"
import { StreamsCalendar } from "./streams-calendar"
import { StreamsList } from "./streams-list"
import { useStreamsCollection } from "./use-streams-collection"
import { ZoomMeetingFilterDrawer } from "./zoom-meeting-filter-drawer"

export function StreamsCollection() {
  const { state, actions, meta } = useStreamsCollection()
  const { youtube, zoom } = meta
  const filtered = state.searchQuery.trim().length > 0 || meta.hasActiveFilters
  const collectionState = meta.isConnected && state.activeView === "calendar" ? state.activeView : meta.listEntries

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

  function handleRetryYouTubeSync() {
    void youtube.actions.sync()
  }

  function handleRetryZoomSync() {
    void zoom.actions.sync()
  }

  return (
    <Page>
      <Page.Header>
        <Page.Heading>
          <Page.Title>Streams</Page.Title>
        </Page.Heading>
      </Page.Header>

      <CollectionToolbar>
        <CollectionToolbar.Views>
          <SegmentedControl value={state.activeView} onValueChange={actions.changeView} fill={meta.isMobile}>
            <CollectionToolbar.ViewItem value="list" icon={<List />}>List</CollectionToolbar.ViewItem>
            <CollectionToolbar.ViewItem value="calendar" icon={<CalendarDays />}>Calendar</CollectionToolbar.ViewItem>
          </SegmentedControl>
        </CollectionToolbar.Views>
        <CollectionToolbar.Actions>
          <Input
            aria-label="Search streams and meetings"
            name="stream-search"
            autoComplete="off"
            icon={<Search />}
            placeholder="Search streams and meetings…"
            className="w-full max-w-md max-mobile:flex-[1_1_100%]"
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
            <Button.Icon aria-label="Sync streams" variant="secondary" icon={<RefreshCw />} onClick={handleSync} disabled={meta.isSyncing || (youtube.meta.needsReauth && !zoom.meta.isConnected)} />
          ) : null}
          {meta.canCreate ? (
            <Button.Icon aria-label="Create stream" variant="secondary" icon={<Plus />} onClick={actions.openCreate} />
          ) : null}
        </CollectionToolbar.Actions>
      </CollectionToolbar>

      <Page.Content className="flex flex-col gap-4">
        {youtube.meta.isConnected && youtube.meta.needsReauth ? (
          <Alert
            variant="error"
            title="YouTube disconnected"
            description="Reconnect YouTube in Settings to resume syncing, creating, and editing streams."
          />
        ) : null}
        {youtube.state.loadError ? (
          <Alert variant="error" title="Could not load YouTube streams" description={youtube.state.loadError} action={<Button variant="secondary" onClick={handleRetryYouTubeLoad}>Retry</Button>} />
        ) : null}
        {zoom.state.loadError ? (
          <Alert variant="error" title="Could not load Zoom meetings" description={zoom.state.loadError} action={<Button variant="secondary" onClick={handleRetryZoomLoad}>Retry</Button>} />
        ) : null}
        {youtube.state.syncError ? (
          <Alert variant="error" title="YouTube sync failed" description={youtube.state.syncError} action={<Button variant="secondary" onClick={handleRetryYouTubeSync}>Retry sync</Button>} />
        ) : null}
        {zoom.state.syncError ? (
          <Alert variant="error" title="Zoom sync failed" description={zoom.state.syncError} action={<Button variant="secondary" onClick={handleRetryZoomSync}>Retry sync</Button>} />
        ) : null}
        <Decision value={meta.isConnected ? collectionState : null} loading={meta.isLoading}>
          <Decision.Loading>
            <LoadingSpinner className="py-6" />
          </Decision.Loading>
          <Decision.Empty>
            {meta.isConnected ? (
              <EmptyState
                icon={<RadioTower />}
                title={filtered ? "No streams match your filters" : "No streams scheduled"}
                description={filtered ? "Try a different search term or clear the provider filters." : "Create a YouTube stream or Zoom meeting to get started."}
              />
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
            {state.activeView === "list" ? (
              <StreamsList entries={meta.listEntries} onSelectStream={actions.selectStream} onSelectMeeting={actions.selectMeeting} />
            ) : (
              <StreamsCalendar events={meta.calendarEvents} onSelectStream={actions.selectStream} onSelectMeeting={actions.selectMeeting} />
            )}
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
