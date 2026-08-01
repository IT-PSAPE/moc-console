import { Card } from "@moc/ui/components/display/card"
import { Decision } from "@moc/ui/components/display/decision"
import { Label } from "@moc/ui/components/display/text"
import { Button } from "@moc/ui/components/controls/button"
import { EmptyState } from "@moc/ui/components/feedback/empty-state"
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner"
import { Drawer } from "@moc/ui/components/overlays/drawer"
import type { ZoomMeeting } from "@moc/types/streams/zoom"
import { Plus, RefreshCw, Settings2, Video } from "lucide-react"
import { MeetingDetailDrawer } from "./meeting-detail-drawer"
import { MeetingListItem } from "./meeting-list-item"
import { MeetingModal } from "./meeting-modal"
import { useZoomMeetings } from "./use-zoom-meetings"
import { ZoomMeetingFilterDrawer } from "./zoom-meeting-filter-drawer"

export function ZoomMeetingsView({ searchQuery }: { searchQuery: string }) {
  const { state, actions, meta } = useZoomMeetings(searchQuery)
  const { filters } = meta

  function renderMeeting(meeting: ZoomMeeting) {
    return <MeetingListItem key={meeting.id} meeting={meeting} onSelect={actions.openDetail} />
  }

  return (
    <>
      <Card>
        <Card.Header tight className="gap-1.5 justify-between">
          <div className="flex items-center gap-1.5">
            <Video className="size-4" />
            <Label.sm>Zoom meetings</Label.sm>
          </div>
          {meta.isConnected && (
            <div className="flex items-center gap-1">
              <Button.Icon aria-label="Filter Zoom meetings" variant="ghost" icon={<Settings2 />} onClick={actions.openFilters} />
              <Button.Icon aria-label="Sync Zoom meetings" variant="ghost" icon={<RefreshCw />} onClick={actions.sync} disabled={state.isSyncing} />
              {meta.canCreate && (
                <Button.Icon aria-label="Create Zoom meeting" variant="secondary" icon={<Plus />} onClick={actions.openCreate} />
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
                  icon={<Video />}
                  title={filters.filters.search || filters.hasActiveFilters ? "No meetings match your filters" : "No meetings scheduled"}
                  description={filters.filters.search || filters.hasActiveFilters ? "Try a different search term or clear filters." : "Schedule a Zoom meeting to get started."}
                />
              ) : (
                <EmptyState
                  icon={<Video />}
                  title="Connect Zoom"
                  description="Connect Zoom in Settings to view and schedule meetings."
                  action={<Button variant="secondary" onClick={actions.openSettings}>Open settings</Button>}
                />
              )}
            </Decision.Empty>
            <Decision.Data>{filters.filtered.map(renderMeeting)}</Decision.Data>
          </Decision>
        </Card.Content>
      </Card>

      <Drawer mobileSide="bottom" open={state.filterOpen} onOpenChange={actions.setFilterOpen}>
        <ZoomMeetingFilterDrawer filters={filters} />
      </Drawer>

      <MeetingModal
        open={state.modalOpen}
        onOpenChange={actions.setModalOpen}
        onSubmit={state.editingMeeting ? actions.update : actions.create}
        meeting={state.editingMeeting}
      />
      <MeetingDetailDrawer
        meeting={state.drawerMeeting}
        open={state.drawerOpen}
        onOpenChange={actions.setDrawerOpen}
        onEdit={actions.edit}
        onDelete={actions.remove}
      />
    </>
  )
}
