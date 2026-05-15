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
import { useStreamFilters } from "./use-stream-filters"
import { StreamFilterDrawer } from "./stream-filter-drawer"
import { StreamListItem } from "./stream-list-item"
import { StreamModal, type StreamFormData } from "./stream-modal"
import { StreamDetailDrawer } from "./stream-detail-drawer"
import { createStream, updateStream, deleteStream, syncStreamsFromYouTube, saveStreamPreset } from "@/data/mutate-streams"
import { getErrorMessage } from "@/utils/get-error-message"
import type { Stream } from "@/types/broadcast/stream"
import { useNavigate } from "react-router-dom"
import { Plus, RefreshCw, Settings2, Tv } from "lucide-react"

export function YouTubeStreamsView({ searchQuery }: { searchQuery: string }) {
  const navigate = useNavigate()
  const { role } = useAuth()
  const { toast } = useFeedback()
  const {
    state: { streams, youtubeConnection, isLoadingStreams },
    actions: { loadStreams, loadYouTubeConnection, syncStream, removeStream, setStreams },
  } = useBroadcast()

  useEffect(() => {
    void loadYouTubeConnection()
    void loadStreams()
  }, [loadYouTubeConnection, loadStreams])

  const streamFilters = useStreamFilters(streams)
  const { filtered, setSearch, filters, hasActiveFilters } = streamFilters

  useEffect(() => {
    setSearch(searchQuery)
  }, [searchQuery, setSearch])

  const [modalOpen, setModalOpen] = useState(false)
  const [editingStream, setEditingStream] = useState<Stream | null>(null)
  const [drawerStream, setDrawerStream] = useState<Stream | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)

  const isConnected = Boolean(youtubeConnection)
  const canCreate = role?.can_create === true

  const handleCreate = useCallback(async (params: StreamFormData) => {
    try {
      const newStream = await createStream(params)
      syncStream(newStream)
      if (params.savePreset) {
        saveStreamPreset({
          title: params.title,
          description: params.description,
          scheduledStartTime: params.scheduledStartTime,
          thumbnailUrl: newStream.thumbnailUrl,
          privacyStatus: params.privacyStatus,
          isForKids: params.isForKids,
          categoryId: params.categoryId,
          tags: params.tags,
          latencyPreference: params.latencyPreference,
          enableDvr: params.enableDvr,
          enableEmbed: params.enableEmbed,
          enableAutoStart: params.enableAutoStart,
          enableAutoStop: params.enableAutoStop,
          playlistId: params.playlistId,
        }).catch(() => { /* non-fatal */ })
      }
      toast({ title: "Stream created", variant: "success" })
    } catch (error) {
      const message = getErrorMessage(error, "The stream could not be created.")
      toast({ title: "Failed to create stream", description: message, variant: "error" })
      throw new Error(message)
    }
  }, [syncStream, toast])

  const handleUpdate = useCallback(async (params: StreamFormData) => {
    if (!editingStream) return
    try {
      const { thumbnail, ...fields } = params
      const updated = await updateStream({ ...editingStream, ...fields }, thumbnail)
      syncStream(updated)
      setEditingStream(null)
      toast({ title: "Stream updated", variant: "success" })
    } catch (error) {
      const message = getErrorMessage(error, "The stream could not be updated.")
      toast({ title: "Failed to update stream", description: message, variant: "error" })
      throw new Error(message)
    }
  }, [editingStream, syncStream, toast])

  const handleDelete = useCallback(async (stream: Stream) => {
    try {
      await deleteStream(stream)
      removeStream(stream.id)
      setDrawerOpen(false)
      toast({ title: "Stream deleted", variant: "success" })
    } catch (error) {
      toast({ title: "Failed to delete stream", description: getErrorMessage(error, "The stream could not be deleted."), variant: "error" })
    }
  }, [removeStream, toast])

  const handleSync = useCallback(async () => {
    setIsSyncing(true)
    try {
      const synced = await syncStreamsFromYouTube()
      setStreams(synced)
      toast({ title: "Streams synced from YouTube", variant: "success" })
    } catch (error) {
      toast({ title: "Failed to sync streams", description: getErrorMessage(error, "Streams could not be synced from YouTube."), variant: "error" })
    } finally {
      setIsSyncing(false)
    }
  }, [setStreams, toast])

  return (
    <>
      <Card>
        <Card.Header tight className="gap-1.5 justify-between">
          <div className="flex items-center gap-1.5">
            <Tv className="size-4" />
            <Label.sm>YouTube Streams</Label.sm>
          </div>
          {isConnected && (
            <div className="flex items-center gap-1">
              <Button.Icon variant="ghost" icon={<Settings2 />} onClick={() => setFilterOpen(true)} />
              <Button.Icon variant="ghost" icon={<RefreshCw />} onClick={handleSync} disabled={isSyncing} />
              {canCreate && (
                <Button.Icon variant="secondary" icon={<Plus />} onClick={() => { setEditingStream(null); setModalOpen(true) }} />
              )}
            </div>
          )}
        </Card.Header>
        <Card.Content ghost className="flex flex-col gap-1.5">
          <Decision value={isConnected ? filtered : null} loading={isLoadingStreams}>
            <Decision.Loading>
              <LoadingSpinner className="py-6" />
            </Decision.Loading>
            <Decision.Empty>
              {isConnected ? (
                <EmptyState
                  icon={<Tv />}
                  title={filters.search || hasActiveFilters ? "No streams match your filters" : "No streams yet"}
                  description={filters.search || hasActiveFilters ? "Try a different search term or clear filters." : "Create a YouTube stream to broadcast live."}
                />
              ) : (
                <EmptyState
                  icon={<Tv />}
                  title="Connect YouTube"
                  description="Connect YouTube in Settings to view and create streams."
                  action={<Button variant="secondary" onClick={() => navigate('/account/settings?tab=streams')}>Open Settings</Button>}
                />
              )}
            </Decision.Empty>
            <Decision.Data>
              {filtered.map((stream) => (
                <StreamListItem
                  key={stream.id}
                  stream={stream}
                  onClick={() => { setDrawerStream(stream); setDrawerOpen(true) }}
                />
              ))}
            </Decision.Data>
          </Decision>
        </Card.Content>
      </Card>

      <Drawer open={filterOpen} onOpenChange={setFilterOpen}>
        <StreamFilterDrawer filters={streamFilters} />
      </Drawer>

      <StreamModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSubmit={editingStream ? handleUpdate : handleCreate}
        stream={editingStream}
        preset={youtubeConnection?.presets ?? null}
      />
      <StreamDetailDrawer
        stream={drawerStream}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onEdit={(s) => { setDrawerOpen(false); setEditingStream(s); setModalOpen(true) }}
        onDelete={handleDelete}
      />
    </>
  )
}
