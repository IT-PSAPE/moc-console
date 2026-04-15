import { useCallback, useEffect, useState } from "react"
import { Card } from "@/components/display/card"
import { Header } from "@/components/display/header"
import { Button } from "@/components/controls/button"
import { Input } from "@/components/form/input"
import { Label, Paragraph, Title } from "@/components/display/text"
import { Spinner } from "@/components/feedback/spinner"
import { useFeedback } from "@/components/feedback/feedback-provider"
import { useAuth } from "@/lib/auth-context"
import { useBroadcast } from "@/features/broadcast/broadcast-provider"
import { useStreamFilters } from "@/features/broadcast/use-stream-filters"
import { useYouTubeOAuth } from "@/features/broadcast/use-youtube-oauth"
import { YouTubeConnectionCard } from "@/features/broadcast/youtube-connection-card"
import { StreamListItem } from "@/features/broadcast/stream-list-item"
import { StreamModal } from "@/features/broadcast/stream-modal"
import type { StreamFormData } from "@/features/broadcast/stream-modal"
import { StreamDetailDrawer } from "@/features/broadcast/stream-detail-drawer"
import { createStream, updateStream, deleteStream, syncStreamsFromYouTube } from "@/data/mutate-streams"
import type { Stream } from "@/types/broadcast/stream"
import { getErrorMessage } from "@/utils/get-error-message"
import { Plus, RefreshCw, Search } from "lucide-react"

export function StreamsScreen() {
  const { role } = useAuth()
  const { toast } = useFeedback()
  const {
    state: { streams, youtubeConnection, isLoadingStreams, isLoadingConnection },
    actions: { loadStreams, loadYouTubeConnection, syncStream, removeStream, setStreams },
  } = useBroadcast()

  const { handleOAuthCallback } = useYouTubeOAuth()
  const { filtered, setSearch, filters } = useStreamFilters(streams)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingStream, setEditingStream] = useState<Stream | null>(null)
  const [drawerStream, setDrawerStream] = useState<Stream | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const isConnected = Boolean(youtubeConnection)
  const canCreate = role?.can_create === true

  // Load data on mount + handle OAuth callback if returning from Google
  useEffect(() => {
    async function init() {
      const result = await handleOAuthCallback()
      if (result.connected) {
        toast({ title: "YouTube connected successfully", variant: "success" })
      } else if (result.error) {
        toast({ title: "Failed to connect YouTube", description: result.error, variant: "error" })
      }
      // Always load fresh data (callback may have just stored a new connection)
      await loadYouTubeConnection()
      loadStreams()
    }
    init()
  }, [handleOAuthCallback, loadYouTubeConnection, loadStreams, toast])

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
        setDrawerOpen(false)
        toast({ title: "Stream deleted", variant: "success" })
      } catch (error) {
        toast({ title: "Failed to delete stream", description: getErrorMessage(error, "The stream could not be deleted."), variant: "error" })
      }
    },
    [removeStream, toast],
  )

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

  const handleStreamClick = useCallback((stream: Stream) => {
    setDrawerStream(stream)
    setDrawerOpen(true)
  }, [])

  const handleEditFromDrawer = useCallback((stream: Stream) => {
    setDrawerOpen(false)
    setEditingStream(stream)
    setModalOpen(true)
  }, [])

  return (
    <section>
      <Header.Root className="p-4 pt-8 mx-auto max-w-content">
        <Header.Lead className="gap-2">
          <Title.h6>Streams</Title.h6>
          <Paragraph.sm className="text-tertiary max-w-2xl">
            Manage your YouTube live streams. Connect your YouTube account to create and schedule broadcasts.
          </Paragraph.sm>
        </Header.Lead>
      </Header.Root>

      <div className="flex flex-col gap-4 p-4 pt-0 mx-auto w-full max-w-content">
        {/* YouTube connection status */}
        {!isLoadingConnection && !isConnected && <YouTubeConnectionCard />}

        {/* Connection info when connected */}
        {isConnected && <YouTubeConnectionCard />}

        {/* Streams list */}
        <Card.Root>
          <Card.Header className="gap-2 justify-between">
            <Label.sm>Streams</Label.sm>
            <div className="flex gap-1 items-center shrink-0">
              <Input
                icon={<Search />}
                placeholder="Search streams..."
                value={filters.search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {isConnected && (
                <>
                  <Button.Icon
                    variant="secondary"
                    icon={<RefreshCw className={isSyncing ? "animate-spin" : ""} />}
                    onClick={handleSync}
                    disabled={isSyncing}
                  />
                  {canCreate && (
                    <Button.Icon
                      variant="secondary"
                      icon={<Plus />}
                      onClick={() => {
                        setEditingStream(null)
                        setModalOpen(true)
                      }}
                    />
                  )}
                </>
              )}
            </div>
          </Card.Header>
          <Card.Content ghost className="flex flex-col gap-1">
            {isLoadingStreams ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : !isConnected ? (
              <div className="flex items-center justify-center py-12">
                <Paragraph.sm className="text-tertiary">
                  Connect YouTube to view and manage streams.
                </Paragraph.sm>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Paragraph.sm className="text-tertiary">
                  {filters.search ? "No streams match your search." : "No streams yet. Create your first stream to get started."}
                </Paragraph.sm>
              </div>
            ) : (
              filtered.map((stream) => (
                <StreamListItem
                  key={stream.id}
                  stream={stream}
                  onClick={() => handleStreamClick(stream)}
                />
              ))
            )}
          </Card.Content>
        </Card.Root>
      </div>

      {/* Create / Edit modal */}
      <StreamModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSubmit={editingStream ? handleUpdateStream : handleCreateStream}
        stream={editingStream}
      />

      {/* Detail drawer */}
      <StreamDetailDrawer
        stream={drawerStream}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onEdit={handleEditFromDrawer}
        onDelete={handleDeleteStream}
      />
    </section>
  )
}
