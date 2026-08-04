import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { createStream, deleteStream, saveStreamPreset, syncStreamsFromYouTube, updateStream, uploadStreamThumbnail } from "@/data/mutate-streams"
import { useWorkspace } from "@/lib/workspace-context"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"
import { getErrorMessage } from "@moc/utils/get-error-message"
import type { Stream } from "@moc/types/streams/stream"
import type { StreamFormData } from "./use-stream-form"
import { useStreamFilters } from "./use-stream-filters"
import { useStreams } from "./streams-provider"

async function getPresetThumbnailUrl(thumbnail: StreamFormData["thumbnail"]): Promise<string | null> {
  if (!thumbnail) return null
  if (thumbnail.origin === "file") {
    return uploadStreamThumbnail(thumbnail.blob).catch(() => null)
  }
  return thumbnail.sourceUrl
}

export function useYouTubeStreams(searchQuery: string) {
  const navigate = useNavigate()
  const { role } = useWorkspace()
  const { toast } = useFeedback()
  const {
    state: { streams, youtubeConnection, isLoadingStreams, isLoadingConnection },
    actions: { loadStreams, loadYouTubeConnection, syncStream, removeStream, setStreams },
  } = useStreams()
  const filters = useStreamFilters(streams)
  const { setSearch } = filters
  const [modalOpen, setModalOpen] = useState(false)
  const [editingStream, setEditingStream] = useState<Stream | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const needsReauth = youtubeConnection?.status === "reauth_required"

  const load = useCallback(async () => {
    try {
      await Promise.all([loadYouTubeConnection(), loadStreams()])
      setLoadError(null)
    } catch (error) {
      setLoadError(getErrorMessage(error, "Streams could not be loaded."))
    }
  }, [loadStreams, loadYouTubeConnection])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setSearch(searchQuery)
  }, [searchQuery, setSearch])

  const guardReauthentication = useCallback(() => {
    if (!needsReauth) return false
    toast({
      title: "YouTube disconnected",
      description: "Reconnect YouTube in Settings to resume this action.",
      variant: "error",
    })
    return true
  }, [needsReauth, toast])

  const create = useCallback(async (params: StreamFormData) => {
    if (guardReauthentication()) return
    try {
      const { stream, thumbnailError } = await createStream(params)
      syncStream(stream)
      if (params.savePreset) {
        const thumbnailUrl = await getPresetThumbnailUrl(params.thumbnail)
        void saveStreamPreset({
          title: params.title,
          description: params.description,
          scheduledStartTime: params.scheduledStartTime,
          thumbnailUrl,
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
        }).catch(() => undefined)
      }
      toast(thumbnailError
        ? { title: "Stream created, but the thumbnail wasn't applied", description: thumbnailError, variant: "warning" }
        : { title: "Stream created", variant: "success" })
    } catch (error) {
      const message = getErrorMessage(error, "The stream could not be created.")
      toast({ title: "Failed to create stream", description: message, variant: "error" })
      throw new Error(message)
    }
  }, [guardReauthentication, syncStream, toast])

  const update = useCallback(async (params: StreamFormData) => {
    if (!editingStream || guardReauthentication()) return
    try {
      const { thumbnail, ...fields } = params
      const { stream, thumbnailError } = await updateStream({ ...editingStream, ...fields }, thumbnail)
      syncStream(stream)
      setEditingStream(null)
      toast(thumbnailError
        ? { title: "Stream updated, but the thumbnail wasn't applied", description: thumbnailError, variant: "warning" }
        : { title: "Stream updated", variant: "success" })
    } catch (error) {
      const message = getErrorMessage(error, "The stream could not be updated.")
      toast({ title: "Failed to update stream", description: message, variant: "error" })
      throw new Error(message)
    }
  }, [editingStream, guardReauthentication, syncStream, toast])

  const remove = useCallback(async (stream: Stream) => {
    if (guardReauthentication()) return
    try {
      await deleteStream(stream)
      removeStream(stream.id)
      toast({ title: "Stream deleted", variant: "success" })
    } catch (error) {
      toast({ title: "Failed to delete stream", description: getErrorMessage(error, "The stream could not be deleted."), variant: "error" })
    }
  }, [guardReauthentication, removeStream, toast])

  const sync = useCallback(async () => {
    if (guardReauthentication()) return
    setIsSyncing(true)
    setSyncError(null)
    try {
      const synced = await syncStreamsFromYouTube()
      setStreams(synced)
      toast({ title: "Streams synced from YouTube", variant: "success" })
    } catch (error) {
      const message = getErrorMessage(error, "Streams could not be synced from YouTube.")
      setSyncError(message)
      toast({ title: "Failed to sync streams", description: message, variant: "error" })
    } finally {
      setIsSyncing(false)
    }
  }, [guardReauthentication, setStreams, toast])

  function openFilters() {
    setFilterOpen(true)
  }

  function edit(stream: Stream) {
    setEditingStream(stream)
    setModalOpen(true)
  }

  function openSettings() {
    navigate("/account/settings?tab=streams")
  }

  return {
    state: { modalOpen, editingStream, isSyncing, filterOpen, loadError, syncError },
    actions: { setModalOpen, setFilterOpen, openFilters, edit, create, update, remove, sync, retryLoad: load, openSettings },
    meta: {
      connection: youtubeConnection,
      filters,
      isConnected: Boolean(youtubeConnection),
      needsReauth,
      canCreate: role?.can_create === true && !needsReauth,
      isLoading: isLoadingStreams || isLoadingConnection,
    },
  }
}
