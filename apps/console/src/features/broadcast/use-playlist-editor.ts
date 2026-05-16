import { useCallback, useEffect, useRef, useState } from "react"
import { randomId } from "@moc/utils/random-id"
import { getErrorMessage } from "@moc/utils/get-error-message"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"
import type { Cue, MediaItem, PlaybackMode, Playlist, PlaylistLane, PlaylistStatus, PlaylistTransition } from "@moc/types/broadcast"
import { flattenLanes } from "@moc/types/broadcast"
import { fetchPlaylistById } from "@/data/fetch-broadcast"
import { updatePlaylist, updatePlaylistLanes, uploadPlaylistThumbnail } from "@/data/mutate-broadcast"

type UsePlaylistEditorArgs = {
  id: string | undefined
  contextPlaylists: Playlist[]
  syncPlaylist: (playlist: Playlist) => void
}

export function usePlaylistEditor({ id, contextPlaylists, syncPlaylist }: UsePlaylistEditorArgs) {
  const { toast } = useFeedback()
  const [playlist, setPlaylist] = useState<Playlist | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [sourceOpen, setSourceOpen] = useState(true)
  const persistedPlaylistRef = useRef<Playlist | null>(null)

  // The editor owns `playlist` once loaded. We read the latest context list
  // through a ref so the initial-load effect can seed from it WITHOUT
  // re-subscribing to it — otherwise every syncPlaylist() (fired on each
  // save) changes contextPlaylists, re-runs the effect, and clobbers the
  // editor's own state, causing a save→sync→reseed→save feedback loop.
  const contextPlaylistsRef = useRef(contextPlaylists)
  useEffect(() => { contextPlaylistsRef.current = contextPlaylists }, [contextPlaylists])

  const openInspector = useCallback(() => setInspectorOpen(true), [])
  const closeInspector = useCallback(() => setInspectorOpen(false), [])
  const toggleSource = useCallback(() => setSourceOpen((v) => !v), [])

  useEffect(() => {
    if (!id) return
    const fromContext = contextPlaylistsRef.current.find((p) => p.id === id)
    if (fromContext) {
      const timerId = window.setTimeout(() => {
        persistedPlaylistRef.current = fromContext
        setPlaylist(fromContext)
        setIsLoading(false)
      }, 0)
      return () => { window.clearTimeout(timerId) }
    }
    let cancelled = false
    fetchPlaylistById(id).then((data) => {
      if (!cancelled) {
        persistedPlaylistRef.current = data ?? null
        setPlaylist(data ?? null)
        setIsLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [id])

  const updateField = useCallback(<K extends keyof Playlist>(field: K, value: Playlist[K]) => {
    setPlaylist((prev) => (prev ? { ...prev, [field]: value } : prev))
  }, [])

  const persistPlaylistMetadata = useCallback((updated: Playlist, previous: Playlist) => {
    setPlaylist(updated)
    syncPlaylist(updated)
    updatePlaylist(updated)
      .then((savedPlaylist) => {
        const nextPlaylist = { ...savedPlaylist, cues: previous.cues, videoSettings: updated.videoSettings }
        persistedPlaylistRef.current = nextPlaylist
        setPlaylist(nextPlaylist)
        syncPlaylist(nextPlaylist)
      })
      .catch((error) => {
        setPlaylist(previous)
        syncPlaylist(previous)
        toast({ title: "Failed to save", description: getErrorMessage(error, "The playlist could not be updated."), variant: "error" })
      })
  }, [syncPlaylist, toast])

  const persistPlaylistLanes = useCallback((lanes: PlaylistLane[]) => {
    if (!playlist) return
    const previous = playlist
    const updated: Playlist = { ...playlist, lanes, cues: flattenLanes(lanes) }
    setPlaylist(updated)
    syncPlaylist(updated)
    updatePlaylistLanes(updated.id, lanes)
      .then((savedLanes) => {
        const next: Playlist = { ...updated, lanes: savedLanes, cues: flattenLanes(savedLanes) }
        persistedPlaylistRef.current = next
        setPlaylist(next)
        syncPlaylist(next)
      })
      .catch((error) => {
        setPlaylist(previous)
        syncPlaylist(previous)
        toast({ title: "Failed to save", description: getErrorMessage(error, "The playlist could not be updated."), variant: "error" })
      })
  }, [playlist, syncPlaylist, toast])

  const handleNameSave = useCallback((name: string) => {
    if (!playlist) return
    persistPlaylistMetadata({ ...playlist, name }, playlist)
  }, [persistPlaylistMetadata, playlist])

  const handleStatusChange = useCallback((status: PlaylistStatus) => {
    if (!playlist) return
    persistPlaylistMetadata({ ...playlist, status }, playlist)
  }, [persistPlaylistMetadata, playlist])

  const handleDescriptionChange = useCallback((value: string) => {
    updateField("description", value)
  }, [updateField])

  const handleDescriptionBlur = useCallback(() => {
    const persisted = persistedPlaylistRef.current
    if (!playlist || !persisted || playlist.description === persisted.description) return
    persistPlaylistMetadata(playlist, playlist)
  }, [persistPlaylistMetadata, playlist])

  const handleDefaultImageDurationChange = useCallback((value: string) => {
    const nextValue = parseInt(value, 10)
    if (!Number.isNaN(nextValue) && nextValue > 0) updateField("defaultImageDuration", nextValue)
  }, [updateField])

  const handleDefaultImageDurationBlur = useCallback(() => {
    const persisted = persistedPlaylistRef.current
    if (!playlist || !persisted || playlist.defaultImageDuration === persisted.defaultImageDuration) return
    persistPlaylistMetadata(playlist, playlist)
  }, [persistPlaylistMetadata, playlist])

  const handleThumbnailUrlChange = useCallback((value: string) => {
    updateField("thumbnailUrl", value.trim() === "" ? null : value)
  }, [updateField])

  const handleThumbnailBlur = useCallback(() => {
    const persisted = persistedPlaylistRef.current
    if (!playlist || !persisted || playlist.thumbnailUrl === persisted.thumbnailUrl) return
    persistPlaylistMetadata(playlist, playlist)
  }, [persistPlaylistMetadata, playlist])

  const handleThumbnailUpload = useCallback(async (file: File | undefined) => {
    if (!playlist || !file) return
    try {
      const url = await uploadPlaylistThumbnail(file)
      persistPlaylistMetadata({ ...playlist, thumbnailUrl: url }, playlist)
    } catch (error) {
      toast({ title: "Upload failed", description: getErrorMessage(error, "The thumbnail could not be uploaded."), variant: "error" })
    }
  }, [persistPlaylistMetadata, playlist, toast])

  const handleThumbnailRemove = useCallback(() => {
    if (!playlist) return
    persistPlaylistMetadata({ ...playlist, thumbnailUrl: null }, playlist)
  }, [persistPlaylistMetadata, playlist])

  const handlePlaybackModeChange = useCallback((mode: PlaybackMode) => {
    if (!playlist) return
    persistPlaylistMetadata(
      { ...playlist, playbackMode: mode, nextPlaylistId: mode === "sequence" ? playlist.nextPlaylistId : null },
      playlist,
    )
  }, [persistPlaylistMetadata, playlist])

  const handleNextPlaylistChange = useCallback((nextId: string) => {
    if (!playlist) return
    persistPlaylistMetadata({ ...playlist, nextPlaylistId: nextId }, playlist)
  }, [persistPlaylistMetadata, playlist])

  const handleTransitionChange = useCallback((transition: PlaylistTransition) => {
    if (!playlist) return
    persistPlaylistMetadata({ ...playlist, transition }, playlist)
  }, [persistPlaylistMetadata, playlist])

  const handleTransitionDurationChange = useCallback((value: string) => {
    const nextValue = parseInt(value, 10)
    if (!Number.isNaN(nextValue) && nextValue >= 0) updateField("transitionDurationMs", nextValue)
  }, [updateField])

  const handleTransitionDurationBlur = useCallback(() => {
    const persisted = persistedPlaylistRef.current
    if (!playlist || !persisted || playlist.transitionDurationMs === persisted.transitionDurationMs) return
    persistPlaylistMetadata(playlist, playlist)
  }, [persistPlaylistMetadata, playlist])

  const handleSelectBackgroundMusic = useCallback((item: MediaItem) => {
    if (!playlist) return
    persistPlaylistMetadata({ ...playlist, backgroundMusicId: item.id, backgroundMusicUrl: item.url, backgroundMusicName: item.name }, playlist)
  }, [persistPlaylistMetadata, playlist])

  const handleRemoveBackgroundMusic = useCallback(() => {
    if (!playlist) return
    persistPlaylistMetadata({ ...playlist, backgroundMusicId: null, backgroundMusicUrl: null, backgroundMusicName: null }, playlist)
  }, [persistPlaylistMetadata, playlist])

  // Adds media to the timeline. Appends the cue to the first visual lane
  // (creating one if the playlist has no lanes yet) so it shows up in the
  // timeline directly — there is no separate cue queue anymore.
  const handleAddMediaToQueue = useCallback((item: MediaItem) => {
    if (!playlist) return
    const targetLane = playlist.lanes.find((l) => l.type === "visual") ?? playlist.lanes[0]
    const makeCue = (laneId: string, order: number): Cue => ({
      id: randomId(),
      mediaItemId: item.id,
      mediaItemName: item.name,
      mediaItemType: item.type,
      laneId,
      order,
      durationOverride: null,
    })

    let nextLanes: PlaylistLane[]
    if (!targetLane) {
      const laneId = randomId()
      nextLanes = [{ id: laneId, order: 0, type: "visual", name: null, cues: [makeCue(laneId, 1)] }]
    } else {
      nextLanes = playlist.lanes.map((lane) =>
        lane.id === targetLane.id
          ? { ...lane, cues: [...lane.cues, makeCue(lane.id, lane.cues.length + 1)] }
          : lane,
      )
    }
    persistPlaylistLanes(nextLanes)
  }, [persistPlaylistLanes, playlist])

  return {
    playlist,
    setPlaylist,
    isLoading,
    inspectorOpen,
    sourceOpen,
    openInspector,
    closeInspector,
    toggleSource,
    persistPlaylistLanes,
    handleNameSave,
    handleStatusChange,
    handleDescriptionChange,
    handleDescriptionBlur,
    handleDefaultImageDurationChange,
    handleDefaultImageDurationBlur,
    handleThumbnailUrlChange,
    handleThumbnailBlur,
    handleThumbnailUpload,
    handleThumbnailRemove,
    handlePlaybackModeChange,
    handleNextPlaylistChange,
    handleTransitionChange,
    handleTransitionDurationChange,
    handleTransitionDurationBlur,
    handleSelectBackgroundMusic,
    handleRemoveBackgroundMusic,
    handleAddMediaToQueue,
  }
}
