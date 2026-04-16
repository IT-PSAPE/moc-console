import { useCallback, useEffect, useState } from "react"
import { Card } from "@/components/display/card"
import { Header } from "@/components/display/header"
import { Button } from "@/components/controls/button"
import { Input } from "@/components/form/input"
import { Label, Paragraph, Title } from "@/components/display/text"
import { Spinner } from "@/components/feedback/spinner"
import { Drawer } from "@/components/overlays/drawer"
import { useFeedback } from "@/components/feedback/feedback-provider"
import { useAuth } from "@/lib/auth-context"
import { useBroadcast } from "@/features/broadcast/broadcast-provider"
import { useStreamFilters } from "@/features/broadcast/use-stream-filters"
import { useZoomMeetingFilters } from "@/features/broadcast/use-zoom-meeting-filters"
import { StreamFilterDrawer } from "@/features/broadcast/stream-filter-drawer"
import { ZoomMeetingFilterDrawer } from "@/features/broadcast/zoom-meeting-filter-drawer"
import { useYouTubeOAuth } from "@/features/broadcast/use-youtube-oauth"
import { useZoomOAuth } from "@/features/broadcast/use-zoom-oauth"
import { YouTubeConnectionCard } from "@/features/broadcast/youtube-connection-card"
import { ZoomConnectionCard } from "@/features/broadcast/zoom-connection-card"
import { StreamListItem } from "@/features/broadcast/stream-list-item"
import { StreamModal } from "@/features/broadcast/stream-modal"
import type { StreamFormData } from "@/features/broadcast/stream-modal"
import { StreamDetailDrawer } from "@/features/broadcast/stream-detail-drawer"
import { MeetingListItem } from "@/features/broadcast/meeting-list-item"
import { MeetingModal } from "@/features/broadcast/meeting-modal"
import { MeetingDetailDrawer } from "@/features/broadcast/meeting-detail-drawer"
import { createStream, updateStream, deleteStream, syncStreamsFromYouTube } from "@/data/mutate-streams"
import { createZoomMeeting, updateZoomMeeting, deleteZoomMeeting, syncZoomMeetings } from "@/data/mutate-zoom"
import type { CreateMeetingParams } from "@/data/mutate-zoom"
import type { Stream } from "@/types/broadcast/stream"
import type { ZoomMeeting } from "@/types/broadcast/zoom"
import { getErrorMessage } from "@/utils/get-error-message"
import { Plus, RefreshCw, Search, Settings2 } from "lucide-react"

export function StreamsScreen() {
  const { role } = useAuth()
  const { toast } = useFeedback()
  const {
    state: {
      streams, youtubeConnection, isLoadingStreams,
      zoomConnection, zoomMeetings, isLoadingZoomMeetings,
    },
    actions: {
      loadStreams, loadYouTubeConnection, syncStream, removeStream, setStreams,
      loadZoomConnection, loadZoomMeetings, syncMeeting, removeMeeting, setZoomMeetings,
    },
  } = useBroadcast()

  const { handleOAuthCallback: handleYouTubeCallback } = useYouTubeOAuth()
  const { handleOAuthCallback: handleZoomCallback } = useZoomOAuth()

  const streamFilters = useStreamFilters(streams)
  const meetingFilters = useZoomMeetingFilters(zoomMeetings)

  // ─── YouTube state ─────────────────────────────────────
  const [streamModalOpen, setStreamModalOpen] = useState(false)
  const [editingStream, setEditingStream] = useState<Stream | null>(null)
  const [drawerStream, setDrawerStream] = useState<Stream | null>(null)
  const [streamDrawerOpen, setStreamDrawerOpen] = useState(false)
  const [isSyncingStreams, setIsSyncingStreams] = useState(false)

  // ─── Zoom state ────────────────────────────────────────
  const [meetingModalOpen, setMeetingModalOpen] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState<ZoomMeeting | null>(null)
  const [drawerMeeting, setDrawerMeeting] = useState<ZoomMeeting | null>(null)
  const [meetingDrawerOpen, setMeetingDrawerOpen] = useState(false)
  const [isSyncingMeetings, setIsSyncingMeetings] = useState(false)

  const isYouTubeConnected = Boolean(youtubeConnection)
  const isZoomConnected = Boolean(zoomConnection)
  const canCreate = role?.can_create === true

  // ─── Init: load data + handle OAuth callbacks ──────────
  useEffect(() => {
    async function init() {
      const [ytResult, zoomResult] = await Promise.all([
        handleYouTubeCallback(),
        handleZoomCallback(),
      ])

      if (ytResult.connected) {
        toast({ title: "YouTube connected successfully", variant: "success" })
      } else if (ytResult.error) {
        toast({ title: "Failed to connect YouTube", description: ytResult.error, variant: "error" })
      }

      if (zoomResult.connected) {
        toast({ title: "Zoom connected successfully", variant: "success" })
      } else if (zoomResult.error) {
        toast({ title: "Failed to connect Zoom", description: zoomResult.error, variant: "error" })
      }

      await Promise.all([
        loadYouTubeConnection(),
        loadZoomConnection(),
      ])

      loadStreams()
      loadZoomMeetings()
    }
    init()
  }, [handleYouTubeCallback, handleZoomCallback, loadYouTubeConnection, loadZoomConnection, loadStreams, loadZoomMeetings, toast])

  // ─── YouTube handlers ──────────────────────────────────

  const handleCreateStream = useCallback(
    async (params: StreamFormData) => {
      try {
        const newStream = await createStream(params)
        syncStream(newStream)
        toast({ title: "Stream created", variant: "success" })
      } catch (error) {
        const message = getErrorMessage(error, "The stream could not be created.")
        toast({ title: "Failed to create stream", description: message, variant: "error" })
        throw new Error(message)
      }
    },
    [syncStream, toast],
  )

  const handleUpdateStream = useCallback(
    async (params: StreamFormData) => {
      if (!editingStream) return
      try {
        const { thumbnail, ...fields } = params
        const updated = await updateStream(
          { ...editingStream, ...fields },
          thumbnail,
        )
        syncStream(updated)
        setEditingStream(null)
        toast({ title: "Stream updated", variant: "success" })
      } catch (error) {
        const message = getErrorMessage(error, "The stream could not be updated.")
        toast({ title: "Failed to update stream", description: message, variant: "error" })
        throw new Error(message)
      }
    },
    [editingStream, syncStream, toast],
  )

  const handleDeleteStream = useCallback(
    async (stream: Stream) => {
      try {
        await deleteStream(stream)
        removeStream(stream.id)
        setStreamDrawerOpen(false)
        toast({ title: "Stream deleted", variant: "success" })
      } catch (error) {
        toast({ title: "Failed to delete stream", description: getErrorMessage(error, "The stream could not be deleted."), variant: "error" })
      }
    },
    [removeStream, toast],
  )

  const handleSyncStreams = useCallback(async () => {
    setIsSyncingStreams(true)
    try {
      const synced = await syncStreamsFromYouTube()
      setStreams(synced)
      toast({ title: "Streams synced from YouTube", variant: "success" })
    } catch (error) {
      toast({ title: "Failed to sync streams", description: getErrorMessage(error, "Streams could not be synced from YouTube."), variant: "error" })
    } finally {
      setIsSyncingStreams(false)
    }
  }, [setStreams, toast])

  // ─── Zoom handlers ────────────────────────────────────

  const handleCreateMeeting = useCallback(
    async (params: CreateMeetingParams) => {
      try {
        const newMeeting = await createZoomMeeting(params)
        syncMeeting(newMeeting)
        toast({ title: "Meeting scheduled", variant: "success" })
      } catch (error) {
        const message = getErrorMessage(error, "The meeting could not be scheduled.")
        toast({ title: "Failed to schedule meeting", description: message, variant: "error" })
        throw new Error(message)
      }
    },
    [syncMeeting, toast],
  )

  const handleUpdateMeeting = useCallback(
    async (params: CreateMeetingParams) => {
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
    },
    [editingMeeting, syncMeeting, toast],
  )

  const handleDeleteMeeting = useCallback(
    async (meeting: ZoomMeeting) => {
      try {
        await deleteZoomMeeting(meeting)
        removeMeeting(meeting.id)
        setMeetingDrawerOpen(false)
        toast({ title: "Meeting deleted", variant: "success" })
      } catch (error) {
        toast({ title: "Failed to delete meeting", description: getErrorMessage(error, "The meeting could not be deleted."), variant: "error" })
      }
    },
    [removeMeeting, toast],
  )

  const handleSyncMeetings = useCallback(async () => {
    setIsSyncingMeetings(true)
    try {
      const synced = await syncZoomMeetings()
      setZoomMeetings(synced)
      toast({ title: "Meetings synced from Zoom", variant: "success" })
    } catch (error) {
      toast({ title: "Failed to sync meetings", description: getErrorMessage(error, "Meetings could not be synced from Zoom."), variant: "error" })
    } finally {
      setIsSyncingMeetings(false)
    }
  }, [setZoomMeetings, toast])

  // ─── Render ────────────────────────────────────────────

  return (
    <section>
      <Header.Root className="p-4 pt-8 mx-auto max-w-content">
        <Header.Lead className="gap-2">
          <Title.h6>Streams</Title.h6>
          <Paragraph.sm className="text-tertiary max-w-2xl">
            Manage your live streams and scheduled meetings. Connect YouTube and Zoom to get started.
          </Paragraph.sm>
        </Header.Lead>
      </Header.Root>

      <div className="flex flex-col gap-4 p-4 pt-0 mx-auto w-full max-w-content">
        {/* Connection cards — side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <YouTubeConnectionCard />
          <ZoomConnectionCard />
        </div>

        {/* Content cards */}
        <div className="space-y-4">
          {/* YouTube Streams */}
          <Card.Root>
            <Card.Header className="gap-2 justify-between">
              <Label.sm>YouTube Streams</Label.sm>
              <div className="flex gap-1 items-center shrink-0">
                <Input
                  icon={<Search />}
                  placeholder="Search..."
                  value={streamFilters.filters.search}
                  onChange={(e) => streamFilters.setSearch(e.target.value)}
                />
                <Drawer.Root>
                  <Drawer.Trigger>
                    <Button.Icon
                      variant={streamFilters.hasActiveFilters ? "primary" : "secondary"}
                      icon={<Settings2 />}
                    />
                  </Drawer.Trigger>
                  <StreamFilterDrawer filters={streamFilters} />
                </Drawer.Root>
                {isYouTubeConnected && (
                  <>
                    <Button.Icon
                      variant="secondary"
                      icon={<RefreshCw className={isSyncingStreams ? "animate-spin" : ""} />}
                      onClick={handleSyncStreams}
                      disabled={isSyncingStreams}
                    />
                    {canCreate && (
                      <Button.Icon
                        variant="secondary"
                        icon={<Plus />}
                        onClick={() => { setEditingStream(null); setStreamModalOpen(true) }}
                      />
                    )}
                  </>
                )}
              </div>
            </Card.Header>
            <Card.Content ghost className="flex flex-col gap-1">
              {isLoadingStreams ? (
                <div className="flex justify-center py-12"><Spinner /></div>
              ) : !isYouTubeConnected ? (
                <div className="flex items-center justify-center py-12">
                  <Paragraph.sm className="text-tertiary">Connect YouTube to view streams.</Paragraph.sm>
                </div>
              ) : streamFilters.filtered.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Paragraph.sm className="text-tertiary">
                    {streamFilters.filters.search || streamFilters.hasActiveFilters
                      ? "No streams match your filters."
                      : "No streams yet."}
                  </Paragraph.sm>
                </div>
              ) : (
                streamFilters.filtered.map((stream) => (
                  <StreamListItem
                    key={stream.id}
                    stream={stream}
                    onClick={() => { setDrawerStream(stream); setStreamDrawerOpen(true) }}
                  />
                ))
              )}
            </Card.Content>
          </Card.Root>

          {/* Zoom Meetings */}
          <Card.Root>
            <Card.Header className="gap-2 justify-between">
              <Label.sm>Zoom Meetings</Label.sm>
              <div className="flex gap-1 items-center shrink-0">
                <Input
                  icon={<Search />}
                  placeholder="Search..."
                  value={meetingFilters.filters.search}
                  onChange={(e) => meetingFilters.setSearch(e.target.value)}
                />
                <Drawer.Root>
                  <Drawer.Trigger>
                    <Button.Icon
                      variant={meetingFilters.hasActiveFilters ? "primary" : "secondary"}
                      icon={<Settings2 />}
                    />
                  </Drawer.Trigger>
                  <ZoomMeetingFilterDrawer filters={meetingFilters} />
                </Drawer.Root>
                {isZoomConnected && (
                  <>
                    <Button.Icon
                      variant="secondary"
                      icon={<RefreshCw className={isSyncingMeetings ? "animate-spin" : ""} />}
                      onClick={handleSyncMeetings}
                      disabled={isSyncingMeetings}
                    />
                    {canCreate && (
                      <Button.Icon
                        variant="secondary"
                        icon={<Plus />}
                        onClick={() => { setEditingMeeting(null); setMeetingModalOpen(true) }}
                      />
                    )}
                  </>
                )}
              </div>
            </Card.Header>
            <Card.Content ghost className="flex flex-col gap-1">
              {isLoadingZoomMeetings ? (
                <div className="flex justify-center py-12"><Spinner /></div>
              ) : !isZoomConnected ? (
                <div className="flex items-center justify-center py-12">
                  <Paragraph.sm className="text-tertiary">Connect Zoom to view meetings.</Paragraph.sm>
                </div>
              ) : meetingFilters.filtered.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Paragraph.sm className="text-tertiary">
                    {meetingFilters.filters.search || meetingFilters.hasActiveFilters
                      ? "No meetings match your filters."
                      : "No meetings scheduled."}
                  </Paragraph.sm>
                </div>
              ) : (
                meetingFilters.filtered.map((meeting) => (
                  <MeetingListItem
                    key={meeting.id}
                    meeting={meeting}
                    onClick={() => { setDrawerMeeting(meeting); setMeetingDrawerOpen(true) }}
                  />
                ))
              )}
            </Card.Content>
          </Card.Root>
        </div>
      </div>

      {/* YouTube modals/drawers */}
      <StreamModal
        open={streamModalOpen}
        onOpenChange={setStreamModalOpen}
        onSubmit={editingStream ? handleUpdateStream : handleCreateStream}
        stream={editingStream}
      />
      <StreamDetailDrawer
        stream={drawerStream}
        open={streamDrawerOpen}
        onOpenChange={setStreamDrawerOpen}
        onEdit={(s) => { setStreamDrawerOpen(false); setEditingStream(s); setStreamModalOpen(true) }}
        onDelete={handleDeleteStream}
      />

      {/* Zoom modals/drawers */}
      <MeetingModal
        open={meetingModalOpen}
        onOpenChange={setMeetingModalOpen}
        onSubmit={editingMeeting ? handleUpdateMeeting : handleCreateMeeting}
        meeting={editingMeeting}
      />
      <MeetingDetailDrawer
        meeting={drawerMeeting}
        open={meetingDrawerOpen}
        onOpenChange={setMeetingDrawerOpen}
        onEdit={(m) => { setMeetingDrawerOpen(false); setEditingMeeting(m); setMeetingModalOpen(true) }}
        onDelete={handleDeleteMeeting}
      />
    </section>
  )
}
