import { useCallback, useEffect, useState } from "react"
import { Card } from "@/components/display/card"
import { Label } from "@/components/display/text"
import { Button } from "@/components/controls/button"
import { Drawer } from "@/components/overlays/drawer"
import { Decision } from "@/components/display/decision"
import { LoadingSpinner } from "@/components/feedback/spinner"
import { EmptyState } from "@/components/feedback/empty-state"
import { useFeedback } from "@/components/feedback/feedback-provider"
import { useAuth } from "@/lib/auth-context"
import { useBroadcast } from "./broadcast-provider"
import { useZoomMeetingFilters } from "./use-zoom-meeting-filters"
import { ZoomMeetingFilterDrawer } from "./zoom-meeting-filter-drawer"
import { MeetingListItem } from "./meeting-list-item"
import { MeetingModal } from "./meeting-modal"
import { MeetingDetailDrawer } from "./meeting-detail-drawer"
import { createZoomMeeting, updateZoomMeeting, deleteZoomMeeting, syncZoomMeetings, type CreateMeetingParams } from "@/data/mutate-zoom"
import { getErrorMessage } from "@/utils/get-error-message"
import type { ZoomMeeting } from "@/types/broadcast/zoom"
import { useNavigate } from "react-router-dom"
import { Plus, RefreshCw, Settings2, Video } from "lucide-react"

export function ZoomMeetingsView({ searchQuery }: { searchQuery: string }) {
  const navigate = useNavigate()
  const { role } = useAuth()
  const { toast } = useFeedback()
  const {
    state: { zoomConnection, zoomMeetings, isLoadingZoomMeetings },
    actions: { loadZoomConnection, loadZoomMeetings, syncMeeting, removeMeeting, setZoomMeetings },
  } = useBroadcast()

  useEffect(() => {
    void loadZoomConnection()
    void loadZoomMeetings()
  }, [loadZoomConnection, loadZoomMeetings])

  const meetingFilters = useZoomMeetingFilters(zoomMeetings)
  const { filtered, setSearch, filters, hasActiveFilters } = meetingFilters

  useEffect(() => {
    setSearch(searchQuery)
  }, [searchQuery, setSearch])

  const [modalOpen, setModalOpen] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState<ZoomMeeting | null>(null)
  const [drawerMeeting, setDrawerMeeting] = useState<ZoomMeeting | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)

  const isConnected = Boolean(zoomConnection)
  const canCreate = role?.can_create === true

  const handleCreate = useCallback(async (params: CreateMeetingParams) => {
    try {
      const newMeeting = await createZoomMeeting(params)
      syncMeeting(newMeeting)
      toast({ title: "Meeting scheduled", variant: "success" })
    } catch (error) {
      const message = getErrorMessage(error, "The meeting could not be scheduled.")
      toast({ title: "Failed to schedule meeting", description: message, variant: "error" })
      throw new Error(message)
    }
  }, [syncMeeting, toast])

  const handleUpdate = useCallback(async (params: CreateMeetingParams) => {
    if (!editingMeeting) return
    try {
      const updated = await updateZoomMeeting({ ...editingMeeting, ...params })
      syncMeeting(updated)
      setEditingMeeting(null)
      toast({ title: "Meeting updated", variant: "success" })
    } catch (error) {
      const message = getErrorMessage(error, "The meeting could not be updated.")
      toast({ title: "Failed to update meeting", description: message, variant: "error" })
      throw new Error(message)
    }
  }, [editingMeeting, syncMeeting, toast])

  const handleDelete = useCallback(async (meeting: ZoomMeeting) => {
    try {
      await deleteZoomMeeting(meeting)
      removeMeeting(meeting.id)
      setDrawerOpen(false)
      toast({ title: "Meeting deleted", variant: "success" })
    } catch (error) {
      toast({ title: "Failed to delete meeting", description: getErrorMessage(error, "The meeting could not be deleted."), variant: "error" })
    }
  }, [removeMeeting, toast])

  const handleSync = useCallback(async () => {
    setIsSyncing(true)
    try {
      const synced = await syncZoomMeetings()
      setZoomMeetings(synced)
      toast({ title: "Meetings synced from Zoom", variant: "success" })
    } catch (error) {
      toast({ title: "Failed to sync meetings", description: getErrorMessage(error, "Meetings could not be synced from Zoom."), variant: "error" })
    } finally {
      setIsSyncing(false)
    }
  }, [setZoomMeetings, toast])

  return (
    <>
      <Card>
        <Card.Header tight className="gap-1.5 justify-between">
          <div className="flex items-center gap-1.5">
            <Video className="size-4" />
            <Label.sm>Zoom Meetings</Label.sm>
          </div>
          {isConnected && (
            <div className="flex items-center gap-1">
              <Button.Icon variant="ghost" icon={<Settings2 />} onClick={() => setFilterOpen(true)} />
              <Button.Icon variant="ghost" icon={<RefreshCw />} onClick={handleSync} disabled={isSyncing} />
              {canCreate && (
                <Button.Icon variant="secondary" icon={<Plus />} onClick={() => { setEditingMeeting(null); setModalOpen(true) }} />
              )}
            </div>
          )}
        </Card.Header>
        <Card.Content ghost className="flex flex-col gap-1.5">
          <Decision value={isConnected ? filtered : null} loading={isLoadingZoomMeetings}>
            <Decision.Loading>
              <LoadingSpinner className="py-6" />
            </Decision.Loading>
            <Decision.Empty>
              {isConnected ? (
                <EmptyState
                  icon={<Video />}
                  title={filters.search || hasActiveFilters ? "No meetings match your filters" : "No meetings scheduled"}
                  description={filters.search || hasActiveFilters ? "Try a different search term or clear filters." : "Schedule a Zoom meeting to get started."}
                />
              ) : (
                <EmptyState
                  icon={<Video />}
                  title="Connect Zoom"
                  description="Connect Zoom in Settings to view and schedule meetings."
                  action={<Button variant="secondary" onClick={() => navigate('/account/settings?tab=streams')}>Open Settings</Button>}
                />
              )}
            </Decision.Empty>
            <Decision.Data>
              {filtered.map((meeting) => (
                <MeetingListItem
                  key={meeting.id}
                  meeting={meeting}
                  onClick={() => { setDrawerMeeting(meeting); setDrawerOpen(true) }}
                />
              ))}
            </Decision.Data>
          </Decision>
        </Card.Content>
      </Card>

      <Drawer open={filterOpen} onOpenChange={setFilterOpen}>
        <ZoomMeetingFilterDrawer filters={meetingFilters} />
      </Drawer>

      <MeetingModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSubmit={editingMeeting ? handleUpdate : handleCreate}
        meeting={editingMeeting}
      />
      <MeetingDetailDrawer
        meeting={drawerMeeting}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onEdit={(m) => { setDrawerOpen(false); setEditingMeeting(m); setModalOpen(true) }}
        onDelete={handleDelete}
      />
    </>
  )
}
