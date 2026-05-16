import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { randomId } from "@moc/utils/random-id"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { Card } from "@moc/ui/components/display/card"
import { Header } from "@moc/ui/components/display/header"
import { Badge } from "@moc/ui/components/display/badge"
import { Button } from "@moc/ui/components/controls/button"
import { Input } from "@moc/ui/components/form/input"
import { InlineEditableText } from "@moc/ui/components/form/inline-editable-text"
import { Label, Paragraph, Title } from "@moc/ui/components/display/text"
import { Divider } from "@moc/ui/components/display/divider"
import { Accordion } from "@moc/ui/components/display/accordion"
import { MetaRow } from "@moc/ui/components/display/meta-row"
import { Spinner } from "@moc/ui/components/feedback/spinner"
import { EmptyState } from "@moc/ui/components/feedback/empty-state"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"
import { useBreadcrumbOverride } from "@moc/ui/components/navigation/breadcrumb"
import { TopBarActions } from "@/features/topbar"
import { useBroadcast } from "@/features/broadcast/broadcast-provider"
import { useMediaFilters } from "@/features/broadcast/use-media-filters"
import { Dropdown } from "@moc/ui/components/overlays/dropdown"
import { playlistStatusColor, playlistStatusLabel, mediaTypeColor, mediaTypeLabel, playbackModeLabel, playlistTransitionLabel } from "@moc/types/broadcast"
import type { Playlist, Cue, MediaItem, MediaType, PlaylistStatus, PlaybackMode, PlaylistTransition } from "@moc/types/broadcast"
import { fetchPlaylistById } from "@/data/fetch-broadcast"
import { updatePlaylist, updatePlaylistCues, uploadPlaylistThumbnail } from "@/data/mutate-broadcast"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
  useDraggable,
  type DraggableAttributes,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities"
import {
  Radio, Search, Trash2, MoreVertical, Clock, Image, Music, Video,
  EllipsisVertical, Loader, FileText, ListMusic, Check, X, Plus, GripVertical,
  Copy, ArrowUpToLine, ArrowDownToLine, EyeOff, Eye, ChevronDown,
  ImagePlus, Repeat, Clapperboard, Upload,
} from "lucide-react"
import { routes } from "@/screens/console-routes"
import { getErrorMessage } from "@moc/utils/get-error-message"

const mediaTypeIcon: Record<MediaType, React.ReactNode> = {
  image: <Image />,
  audio: <Music />,
  video: <Video />,
}

const allStatuses: PlaylistStatus[] = ["draft", "published"]
const allPlaybackModes: PlaybackMode[] = ["loop", "stop", "sequence"]
const allTransitions: PlaylistTransition[] = ["cut", "fade", "crossfade"]

function formatRuntime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  return `${m}:${String(s).padStart(2, "0")}`
}

export function PlaylistDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const isNew = (location.state as { isNew?: boolean } | null)?.isNew ?? false
  const { toast } = useFeedback()
  const {
    state: { media, playlists: contextPlaylists },
    actions: { loadMedia, syncPlaylist },
  } = useBroadcast()

  const [playlist, setPlaylist] = useState<Playlist | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dragActiveItem, setDragActiveItem] = useState<MediaItem | null>(null)
  const [dragActiveCue, setDragActiveCue] = useState<Cue | null>(null)
  const [dropInsertIndex, setDropInsertIndex] = useState<number | null>(null)
  const persistedPlaylistRef = useRef<Playlist | null>(null)
  const mediaPanelRef = useRef<HTMLDivElement>(null)
  const handleBrowseMedia = useCallback(() => {
    const input = mediaPanelRef.current?.querySelector("input")
    input?.focus()
  }, [])

  useBreadcrumbOverride(id ?? "", playlist?.name)

  useEffect(() => { loadMedia() }, [loadMedia])

  useEffect(() => {
    if (!id) return
    const fromContext = contextPlaylists.find((p) => p.id === id)
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
  }, [id, contextPlaylists])

  const mediaFilters = useMediaFilters(media)
  const { filtered: allFilteredMedia, setSearch, filters: mediaFilterState } = mediaFilters
  const filteredMedia = useMemo(() => allFilteredMedia.filter((m) => m.type !== "audio"), [allFilteredMedia])

  const totalRuntime = useMemo(() => {
    if (!playlist) return 0
    return playlist.cues
      .filter((c) => !c.disabled)
      .reduce((sum, cue) => {
        const duration = cue.durationOverride
          ?? (cue.mediaItemType === "image" ? playlist.defaultImageDuration : null)
          ?? media.find((m) => m.id === cue.mediaItemId)?.duration
          ?? 0
        return sum + duration
      }, 0)
  }, [playlist, media])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // ─── Property edits ─────────────────────────────────

  const updateField = useCallback(<K extends keyof Playlist>(field: K, value: Playlist[K]) => {
    setPlaylist((prev) => (prev ? { ...prev, [field]: value } : prev))
  }, [])

  const persistPlaylistMetadata = useCallback((updated: Playlist, previous: Playlist) => {
    setPlaylist(updated)
    syncPlaylist(updated)
    updatePlaylist(updated)
      .then((savedPlaylist) => {
        const nextPlaylist = {
          ...savedPlaylist,
          cues: previous.cues,
          videoSettings: updated.videoSettings,
        }
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

  const persistPlaylistQueue = useCallback((updated: Playlist, previous: Playlist) => {
    setPlaylist(updated)
    syncPlaylist(updated)

    Promise.all([
      updatePlaylist(updated),
      updatePlaylistCues(updated.id, updated.cues),
    ])
      .then(([savedPlaylist, savedCues]) => {
        const nextPlaylist = {
          ...savedPlaylist,
          cues: savedCues,
          videoSettings: updated.videoSettings,
        }
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
    const persistedPlaylist = persistedPlaylistRef.current

    if (!playlist || !persistedPlaylist || playlist.description === persistedPlaylist.description) {
      return
    }

    persistPlaylistMetadata(playlist, playlist)
  }, [persistPlaylistMetadata, playlist])

  const handleDefaultImageDurationChange = useCallback((value: string) => {
    const nextValue = parseInt(value, 10)
    if (!Number.isNaN(nextValue) && nextValue > 0) {
      updateField("defaultImageDuration", nextValue)
    }
  }, [updateField])

  const handleDefaultImageDurationBlur = useCallback(() => {
    const persistedPlaylist = persistedPlaylistRef.current

    if (!playlist) {
      return
    }

    if (!persistedPlaylist || playlist.defaultImageDuration === persistedPlaylist.defaultImageDuration) {
      return
    }

    persistPlaylistMetadata(playlist, playlist)
  }, [persistPlaylistMetadata, playlist])

  const thumbnailInputRef = useRef<HTMLInputElement>(null)

  const handleThumbnailUrlChange = useCallback((value: string) => {
    updateField("thumbnailUrl", value.trim() === "" ? null : value)
  }, [updateField])

  const handleThumbnailBlur = useCallback(() => {
    const persistedPlaylist = persistedPlaylistRef.current
    if (!playlist || !persistedPlaylist || playlist.thumbnailUrl === persistedPlaylist.thumbnailUrl) {
      return
    }
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
    if (!Number.isNaN(nextValue) && nextValue >= 0) {
      updateField("transitionDurationMs", nextValue)
    }
  }, [updateField])

  const handleTransitionDurationBlur = useCallback(() => {
    const persistedPlaylist = persistedPlaylistRef.current
    if (!playlist || !persistedPlaylist || playlist.transitionDurationMs === persistedPlaylist.transitionDurationMs) {
      return
    }
    persistPlaylistMetadata(playlist, playlist)
  }, [persistPlaylistMetadata, playlist])

  // ─── Add media to queue ─────────────────────────────

  const handleAddMediaToQueue = useCallback((item: MediaItem) => {
    if (!playlist) return
    const newCue: Cue = {
      id: randomId(),
      mediaItemId: item.id,
      mediaItemName: item.name,
      mediaItemType: item.type,
      order: playlist.cues.length + 1,
      durationOverride: null,
    }
    const newCues = [...playlist.cues, newCue]
    persistPlaylistQueue({ ...playlist, cues: newCues }, playlist)
  }, [persistPlaylistQueue, playlist])

  // ─── Cue mutations ──────────────────────────────────

  const handleRemoveCue = useCallback((cueId: string) => {
    if (!playlist) return
    const cues = playlist.cues
      .filter((c) => c.id !== cueId)
      .map((c, i) => ({ ...c, order: i + 1 }))
    persistPlaylistQueue({ ...playlist, cues }, playlist)
  }, [persistPlaylistQueue, playlist])

  const handleUpdateCue = useCallback((updatedCue: Cue) => {
    if (!playlist) return
    const cues = playlist.cues.map((cue) => cue.id === updatedCue.id ? updatedCue : cue)
    persistPlaylistQueue({ ...playlist, cues }, playlist)
  }, [persistPlaylistQueue, playlist])

  const handleDuplicateCue = useCallback((cueId: string) => {
    if (!playlist) return
    const idx = playlist.cues.findIndex((cue) => cue.id === cueId)
    if (idx === -1) return
    const original = playlist.cues[idx]
    const clone: Cue = {
      ...original,
      id: randomId(),
    }
    const newCues = [...playlist.cues]
    newCues.splice(idx + 1, 0, clone)
    persistPlaylistQueue({ ...playlist, cues: newCues.map((cue, index) => ({ ...cue, order: index + 1 })) }, playlist)
  }, [persistPlaylistQueue, playlist])

  const handleMoveToTop = useCallback((cueId: string) => {
    if (!playlist) return
    const idx = playlist.cues.findIndex((cue) => cue.id === cueId)
    if (idx <= 0) return
    const cues = [...playlist.cues]
    const [moved] = cues.splice(idx, 1)
    cues.unshift(moved)
    persistPlaylistQueue({ ...playlist, cues: cues.map((cue, index) => ({ ...cue, order: index + 1 })) }, playlist)
  }, [persistPlaylistQueue, playlist])

  const handleMoveToBottom = useCallback((cueId: string) => {
    if (!playlist) return
    const idx = playlist.cues.findIndex((cue) => cue.id === cueId)
    if (idx === -1 || idx === playlist.cues.length - 1) return
    const cues = [...playlist.cues]
    const [moved] = cues.splice(idx, 1)
    cues.push(moved)
    persistPlaylistQueue({ ...playlist, cues: cues.map((cue, index) => ({ ...cue, order: index + 1 })) }, playlist)
  }, [persistPlaylistQueue, playlist])

  const handleToggleDisable = useCallback((cueId: string) => {
    if (!playlist) return
    persistPlaylistQueue({
      ...playlist,
      cues: playlist.cues.map((cue) => cue.id === cueId ? { ...cue, disabled: !cue.disabled } : cue),
    }, playlist)
  }, [persistPlaylistQueue, playlist])

  // ─── Drag from media → queue ────────────────────────

  function handleDragStart(event: DragStartEvent) {
    const mediaItem = media.find((m) => m.id === event.active.id)
    if (mediaItem) {
      setDragActiveItem(mediaItem)
      return
    }
    const cue = playlist?.cues.find((c) => c.id === event.active.id)
    if (cue) setDragActiveCue(cue)
  }

  function handleDragOver(event: DragOverEvent) {
    if (!event.over || !playlist) {
      setDropInsertIndex(null)
      return
    }
    const overId = String(event.over.id)
    if (overId === "queue-drop-zone") {
      setDropInsertIndex(playlist.cues.length)
      return
    }
    const overIndex = playlist.cues.findIndex((c) => c.id === overId)
    if (overIndex >= 0 && dragActiveCue && dragActiveCue.id !== overId) {
      setDropInsertIndex(overIndex)
    } else if (overIndex >= 0) {
      setDropInsertIndex(overIndex)
    } else {
      setDropInsertIndex(null)
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setDragActiveItem(null)
    setDragActiveCue(null)
    setDropInsertIndex(null)

    if (!event.over || !playlist) return

    const overId = String(event.over.id)
    const isQueueTarget = overId === "queue-drop-zone" || playlist.cues.some((c) => c.id === overId)

    // Check if this is a cue reorder (active is an existing cue)
    const activeCueIndex = playlist.cues.findIndex((c) => c.id === event.active.id)
    if (activeCueIndex >= 0 && isQueueTarget) {
      // Cue reordering
      if (overId === "queue-drop-zone" || event.active.id === event.over.id) return
      const overIndex = playlist.cues.findIndex((c) => c.id === overId)
      if (overIndex === -1) return

      const reordered = [...playlist.cues]
      const [moved] = reordered.splice(activeCueIndex, 1)
      reordered.splice(overIndex, 0, moved)
      const renumbered = reordered.map((c, i) => ({ ...c, order: i + 1 }))

      persistPlaylistQueue({ ...playlist, cues: renumbered }, playlist)
      return
    }

    // Media → queue drop (only if dropped on a valid queue target)
    if (!isQueueTarget) return

    const mediaItem = media.find((m) => m.id === event.active.id)
    if (!mediaItem || mediaItem.type === "audio") return

    const insertAt = (() => {
      if (overId === "queue-drop-zone") return playlist.cues.length
      const idx = playlist.cues.findIndex((c) => c.id === overId)
      return idx >= 0 ? idx : playlist.cues.length
    })()

    const newCue: Cue = {
      id: randomId(),
      mediaItemId: mediaItem.id,
      mediaItemName: mediaItem.name,
      mediaItemType: mediaItem.type,
      order: insertAt + 1,
      durationOverride: null,
    }

    const newCues = [...playlist.cues]
    newCues.splice(insertAt, 0, newCue)
    const renumbered = newCues.map((c, i) => ({ ...c, order: i + 1 }))

    persistPlaylistQueue({ ...playlist, cues: renumbered }, playlist)
  }

  function handleDragCancel() {
    setDragActiveItem(null)
    setDragActiveCue(null)
    setDropInsertIndex(null)
  }

  // ─── Loading / not found ────────────────────────────

  if (isLoading) {
    return (
      <section className="flex justify-center py-16 mx-auto max-w-content-sm">
        <Spinner size="lg" />
      </section>
    )
  }

  if (!playlist) {
    return (
      <section className="mx-auto max-w-content-md">
        <EmptyState icon={<Radio />} title="Playlist not found" description="The playlist you're looking for doesn't exist." />
      </section>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <section className="mx-auto h-full flex flex-col max-w-content-md">
        <TopBarActions>
          <Dropdown placement="bottom">
            <Dropdown.Trigger>
              <Button.Icon variant="secondary" icon={<EllipsisVertical />} />
            </Dropdown.Trigger>
            <Dropdown.Panel>
              <Dropdown.Item onSelect={() => navigate(`/${routes.broadcastPlaylists}`)}>
                <ListMusic className="size-4" />
                Back to Playlists
              </Dropdown.Item>
            </Dropdown.Panel>
          </Dropdown>
        </TopBarActions>

        <Header className="px-4 pt-12">
          <Header.Lead className="gap-2">
            <Title.h5>
              <InlineEditableText value={playlist.name} onSave={handleNameSave} placeholder="Untitled" autoEdit={isNew} />
            </Title.h5>
          </Header.Lead>
        </Header>

        <Accordion type="single" defaultValue="details" className="px-4">
          <Accordion.Item value="details">
            <Accordion.Trigger className="flex items-center gap-2 py-2">
              <Label.sm>Details</Label.sm>
              <ChevronDown className="size-3.5 text-tertiary transition-transform data-[state=open]:rotate-180" />
            </Accordion.Trigger>
            <Accordion.Content>
              <div className="space-y-3 pb-3">
                <MetaRow icon={<Loader />} label="Status">
                  <Dropdown placement="bottom">
                    <Dropdown.Trigger>
                      <Badge
                        label={playlistStatusLabel[playlist.status]}
                        color={playlistStatusColor[playlist.status]}
                        className="cursor-pointer"
                      />
                    </Dropdown.Trigger>
                    <Dropdown.Panel>
                      {allStatuses.map((s) => (
                        <Dropdown.Item key={s} onSelect={() => handleStatusChange(s)}>
                          <span className="size-4 shrink-0 flex items-center justify-center">
                            {s === playlist.status && <Check className="size-3.5 text-brand_secondary" />}
                          </span>
                          {playlistStatusLabel[s]}
                        </Dropdown.Item>
                      ))}
                    </Dropdown.Panel>
                  </Dropdown>
                </MetaRow>

                <MetaRow icon={<FileText />} label="Description">
                  <textarea
                    className="all-unset w-full text-xs text-primary placeholder:text-quaternary resize-none"
                    rows={2}
                    value={playlist.description}
                    onChange={(e) => handleDescriptionChange(e.target.value)}
                    onBlur={handleDescriptionBlur}
                    placeholder="Describe this playlist..."
                  />
                </MetaRow>

                <MetaRow icon={<ImagePlus />} label="Thumbnail">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {playlist.thumbnailUrl && (
                      <img
                        src={playlist.thumbnailUrl}
                        alt=""
                        className="size-9 rounded object-cover border border-tertiary shrink-0"
                      />
                    )}
                    <Input
                      value={playlist.thumbnailUrl ?? ""}
                      onChange={(e) => handleThumbnailUrlChange(e.target.value)}
                      onBlur={handleThumbnailBlur}
                      placeholder="Paste image URL or upload..."
                      className="flex-1 min-w-0"
                    />
                    <input
                      ref={thumbnailInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => { handleThumbnailUpload(e.target.files?.[0]); e.target.value = "" }}
                    />
                    <Button.Icon
                      variant="secondary"
                      icon={<Upload />}
                      onClick={() => thumbnailInputRef.current?.click()}
                      title="Upload image"
                      className="shrink-0"
                    />
                    {playlist.thumbnailUrl && (
                      <button
                        onClick={handleThumbnailRemove}
                        className="p-0.5 rounded hover:bg-secondary cursor-pointer text-quaternary hover:text-secondary transition-colors shrink-0"
                        title="Remove thumbnail"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>
                </MetaRow>
              </div>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>

        <Divider className="px-4 my-2" />

        {/* Queue section — media left, cues right */}
        <div className="flex-1 min-h-0 flex gap-2 p-4 pt-2 mx-auto w-full max-w-content max-mobile:flex-col">
          {/* Left panel — media library (draggable items) */}
          <div ref={mediaPanelRef} className="w-80 shrink-0 flex flex-col overflow-hidden max-mobile:w-full max-mobile:shrink max-mobile:h-64">
            <Card className="flex-1 flex flex-col overflow-hidden">
              <Card.Header className="gap-2 justify-between">
                <Label.sm>Media</Label.sm>

                <Input
                    icon={<Search />}
                    placeholder="Search media..."
                    value={mediaFilterState.search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
              </Card.Header>
              <Card.Content className="flex flex-col flex-1 min-h-0 overflow-hidden">
                  {filteredMedia.map((item) => (
                    <DraggableMediaItem key={item.id} item={item} onAdd={handleAddMediaToQueue} />
                  ))}
              </Card.Content>
            </Card>
          </div>

          {/* Right panel — cue queue + playback settings */}
          <div className="flex-1 min-w-0 flex flex-col gap-2 overflow-hidden max-mobile:min-h-0">
            <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <Card.Header className="gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <ListMusic className="size-4 text-tertiary" />
                  <Label.sm>Queue</Label.sm>
                </div>
                <Label.xs className="text-tertiary shrink-0">
                  {playlist.cues.length} cue{playlist.cues.length !== 1 ? "s" : ""}
                  {totalRuntime > 0 && ` \u00b7 ${formatRuntime(totalRuntime)}`}
                </Label.xs>
              </Card.Header>
              <Card.Content className="flex-1 overflow-y-auto">
                <QueueDropZone
                  cues={playlist.cues}
                  dropInsertIndex={dropInsertIndex}
                  isDraggingMedia={!!dragActiveItem}
                  isDraggingCue={!!dragActiveCue}
                  dragActiveCueId={dragActiveCue?.id ?? null}
                  onRemove={handleRemoveCue}
                  onUpdateCue={handleUpdateCue}
                  onDuplicate={handleDuplicateCue}
                  onMoveToTop={handleMoveToTop}
                  onMoveToBottom={handleMoveToBottom}
                  onToggleDisable={handleToggleDisable}
                  defaultImageDuration={playlist.defaultImageDuration}
                  media={media}
                  onBrowseMedia={handleBrowseMedia}
                />
              </Card.Content>
            </Card>

            {/* Playback defaults — unified strip */}
            <div className="rounded-lg border border-tertiary bg-secondary_alt p-1.5">
              <div className="bg-primary rounded-md border border-tertiary divide-y divide-tertiary">
                {/* Overlay Audio */}
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Music className="size-3.5 text-tertiary" />
                    <Label.xs className="text-tertiary">Overlay Audio</Label.xs>
                  </div>
                  {playlist.backgroundMusicUrl ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Paragraph.xs className="truncate flex-1">{playlist.backgroundMusicName ?? "Audio"}</Paragraph.xs>
                      <audio src={playlist.backgroundMusicUrl} controls preload="metadata" className="h-6 max-w-40" />
                      <button
                        onClick={() => persistPlaylistMetadata({ ...playlist, backgroundMusicId: null, backgroundMusicUrl: null, backgroundMusicName: null }, playlist)}
                        className="p-0.5 rounded hover:bg-secondary cursor-pointer text-quaternary hover:text-secondary transition-colors"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <Dropdown placement="top">
                      <Dropdown.Trigger>
                        <Paragraph.xs className="text-quaternary cursor-pointer hover:text-secondary transition-colors">Select audio...</Paragraph.xs>
                      </Dropdown.Trigger>
                      <Dropdown.Panel>
                        {media.filter((m) => m.type === "audio").map((audioItem) => (
                          <Dropdown.Item
                            key={audioItem.id}
                            onSelect={() => persistPlaylistMetadata({
                              ...playlist,
                              backgroundMusicId: audioItem.id,
                              backgroundMusicUrl: audioItem.url,
                              backgroundMusicName: audioItem.name,
                            }, playlist)}
                          >
                            <Music className="size-4" />
                            {audioItem.name}
                          </Dropdown.Item>
                        ))}
                        {media.filter((m) => m.type === "audio").length === 0 && (
                          <div className="px-2 py-1.5 text-sm text-quaternary">No audio items in library</div>
                        )}
                      </Dropdown.Panel>
                    </Dropdown>
                  )}
                </div>

                {/* Defaults row — image duration */}
                <div className="flex items-center gap-4 px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <Image className="size-3.5 text-tertiary shrink-0" />
                    <Label.xs className="text-tertiary">Image</Label.xs>
                    <Input
                      value={String(playlist.defaultImageDuration)}
                      onChange={(e) => handleDefaultImageDurationChange(e.target.value)}
                      onBlur={handleDefaultImageDurationBlur}
                      placeholder="sec"
                      className="!w-14 !py-0.5 !px-1.5"
                    />
                    <Paragraph.xs className="text-tertiary">s</Paragraph.xs>
                  </div>
                </div>

                {/* End behaviour + transition */}
                <div className="flex items-center gap-4 px-3 py-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Repeat className="size-3.5 text-tertiary shrink-0" />
                    <Label.xs className="text-tertiary">At end</Label.xs>
                    <Dropdown placement="top">
                      <Dropdown.Trigger>
                        <Paragraph.xs className="cursor-pointer hover:text-secondary transition-colors">
                          {playbackModeLabel[playlist.playbackMode]}
                        </Paragraph.xs>
                      </Dropdown.Trigger>
                      <Dropdown.Panel>
                        {allPlaybackModes.map((m) => (
                          <Dropdown.Item key={m} onSelect={() => handlePlaybackModeChange(m)}>
                            <span className="size-4 shrink-0 flex items-center justify-center">
                              {m === playlist.playbackMode && <Check className="size-3.5 text-brand_secondary" />}
                            </span>
                            {playbackModeLabel[m]}
                          </Dropdown.Item>
                        ))}
                      </Dropdown.Panel>
                    </Dropdown>
                  </div>

                  {playlist.playbackMode === "sequence" && (
                    <div className="flex items-center gap-1.5">
                      <Label.xs className="text-tertiary">Then play</Label.xs>
                      <Dropdown placement="top">
                        <Dropdown.Trigger>
                          <Paragraph.xs className="cursor-pointer hover:text-secondary transition-colors">
                            {contextPlaylists.find((p) => p.id === playlist.nextPlaylistId)?.name ?? "Select playlist..."}
                          </Paragraph.xs>
                        </Dropdown.Trigger>
                        <Dropdown.Panel>
                          {contextPlaylists.filter((p) => p.id !== playlist.id).map((p) => (
                            <Dropdown.Item key={p.id} onSelect={() => handleNextPlaylistChange(p.id)}>
                              <span className="size-4 shrink-0 flex items-center justify-center">
                                {p.id === playlist.nextPlaylistId && <Check className="size-3.5 text-brand_secondary" />}
                              </span>
                              {p.name}
                            </Dropdown.Item>
                          ))}
                          {contextPlaylists.filter((p) => p.id !== playlist.id).length === 0 && (
                            <div className="px-2 py-1.5 text-sm text-quaternary">No other playlists</div>
                          )}
                        </Dropdown.Panel>
                      </Dropdown>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5">
                    <Clapperboard className="size-3.5 text-tertiary shrink-0" />
                    <Label.xs className="text-tertiary">Transition</Label.xs>
                    <Dropdown placement="top">
                      <Dropdown.Trigger>
                        <Paragraph.xs className="cursor-pointer hover:text-secondary transition-colors">
                          {playlistTransitionLabel[playlist.transition]}
                        </Paragraph.xs>
                      </Dropdown.Trigger>
                      <Dropdown.Panel>
                        {allTransitions.map((t) => (
                          <Dropdown.Item key={t} onSelect={() => handleTransitionChange(t)}>
                            <span className="size-4 shrink-0 flex items-center justify-center">
                              {t === playlist.transition && <Check className="size-3.5 text-brand_secondary" />}
                            </span>
                            {playlistTransitionLabel[t]}
                          </Dropdown.Item>
                        ))}
                      </Dropdown.Panel>
                    </Dropdown>
                    {playlist.transition !== "cut" && (
                      <>
                        <Input
                          value={String(playlist.transitionDurationMs)}
                          onChange={(e) => handleTransitionDurationChange(e.target.value)}
                          onBlur={handleTransitionDurationBlur}
                          placeholder="ms"
                          className="!w-16 !py-0.5 !px-1.5"
                        />
                        <Paragraph.xs className="text-tertiary">ms</Paragraph.xs>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {dragActiveItem && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-brand bg-primary shadow-lg opacity-90">
              <span className="*:size-4 text-tertiary">{mediaTypeIcon[dragActiveItem.type]}</span>
              <Label.sm className="truncate">{dragActiveItem.name}</Label.sm>
            </div>
          )}
          {dragActiveCue && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-brand bg-primary shadow-lg opacity-90">
              <GripVertical className="size-4 text-quaternary" />
              <span className="*:size-4 text-tertiary">{mediaTypeIcon[dragActiveCue.mediaItemType]}</span>
              <Label.sm className="truncate">{dragActiveCue.mediaItemName}</Label.sm>
            </div>
          )}
        </DragOverlay>
      </section>
    </DndContext>
  )
}

// ─── Draggable Media Item ─────────────────────────────

function DraggableMediaItem({ item, onAdd }: { item: MediaItem; onAdd?: (item: MediaItem) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { type: "media", item },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="flex items-center gap-3 px-3 py-2.5 cursor-grab hover:bg-primary_hover transition-colors border-b border-secondary"
    >
      <div className="size-8 shrink-0 rounded bg-secondary flex items-center justify-center overflow-hidden">
        {item.thumbnail ? (
          <img src={item.thumbnail} alt={item.name} className="size-full object-cover" />
        ) : (
          <span className="text-tertiary *:size-4">{mediaTypeIcon[item.type]}</span>
        )}
      </div>
      <Label.sm className="flex-1 truncate">{item.name}</Label.sm>
      <Badge label={mediaTypeLabel[item.type]} color={mediaTypeColor[item.type]} />
      {onAdd && (
        <button
          onClick={(e) => { e.stopPropagation(); onAdd(item) }}
          onPointerDown={(e) => e.stopPropagation()}
          className="p-1 rounded hover:bg-secondary cursor-pointer text-quaternary hover:text-brand transition-colors"
        >
          <Plus className="size-4" />
        </button>
      )}
    </div>
  )
}

// ─── Queue Drop Zone ──────────────────────────────────

function QueueDropZone({
  cues,
  dropInsertIndex,
  isDraggingMedia,
  isDraggingCue,
  dragActiveCueId,
  onRemove,
  onUpdateCue,
  onDuplicate,
  onMoveToTop,
  onMoveToBottom,
  onToggleDisable,
  defaultImageDuration,
  media,
  onBrowseMedia,
}: {
  cues: Cue[]
  dropInsertIndex: number | null
  isDraggingMedia: boolean
  isDraggingCue: boolean
  dragActiveCueId: string | null
  onRemove: (cueId: string) => void
  onUpdateCue: (cue: Cue) => void
  onDuplicate: (cueId: string) => void
  onMoveToTop: (cueId: string) => void
  onMoveToBottom: (cueId: string) => void
  onToggleDisable: (cueId: string) => void
  defaultImageDuration: number
  media: MediaItem[]
  onBrowseMedia?: () => void
}) {
  const isDragging = isDraggingMedia || isDraggingCue
  const { setNodeRef, isOver } = useDroppable({ id: "queue-drop-zone" })

  if (cues.length === 0) {
    return (
      <div
        ref={setNodeRef}
        className={`flex flex-col items-center justify-center gap-3 py-16 rounded-lg border-2 border-dashed transition-colors ${
          isOver && isDraggingMedia ? "border-brand bg-brand_secondary" : "border-secondary"
        }`}
      >
        <EmptyState
          icon={<ListMusic />}
          title="Build your queue"
          description={isDraggingMedia ? "Drop here to add" : "Drag media from the library or click + to add items"}
        />
        {!isDraggingMedia && onBrowseMedia && (
          <Button variant="secondary" icon={<Plus />} onClick={onBrowseMedia}>
            Browse Media
          </Button>
        )}
      </div>
    )
  }

  return (
    <div ref={setNodeRef} className="flex flex-col min-h-full">
      {cues.map((cue, index) => (
        <div key={cue.id}>
          {isDragging && dropInsertIndex === index && cue.id !== dragActiveCueId && <DropIndicatorLine />}
          <DroppableCueRow cue={cue} totalCues={cues.length} onRemove={onRemove} onUpdateCue={onUpdateCue} onDuplicate={onDuplicate} onMoveToTop={onMoveToTop} onMoveToBottom={onMoveToBottom} onToggleDisable={onToggleDisable} defaultImageDuration={defaultImageDuration} media={media} />
        </div>
      ))}
      {isDragging && dropInsertIndex === cues.length && <DropIndicatorLine />}
      {isDraggingMedia && (
        <div className={`flex-1 min-h-16 flex items-center justify-center transition-colors ${
          isOver && dropInsertIndex === cues.length ? "bg-brand_secondary" : ""
        }`}>
          <Paragraph.xs className="text-tertiary">Drop here to add at end</Paragraph.xs>
        </div>
      )}
    </div>
  )
}

function DropIndicatorLine() {
  return (
    <div className="relative h-0 z-10 pointer-events-none">
      <div className="absolute inset-x-3 h-0.5 -top-px bg-brand rounded-full" />
      <div className="absolute left-2 -top-1 size-2.5 rounded-full bg-brand" />
      <div className="absolute right-2 -top-1 size-2.5 rounded-full bg-brand" />
    </div>
  )
}

// ─── Cue Row (droppable target for position) ──────────

type CueRowActions = {
  onRemove: (id: string) => void
  onUpdateCue: (cue: Cue) => void
  onDuplicate: (id: string) => void
  onMoveToTop: (id: string) => void
  onMoveToBottom: (id: string) => void
  onToggleDisable: (id: string) => void
}

function DroppableCueRow({ cue, totalCues, onRemove, onUpdateCue, onDuplicate, onMoveToTop, onMoveToBottom, onToggleDisable, defaultImageDuration, media }: { cue: Cue; totalCues: number } & CueRowActions & { defaultImageDuration: number; media: MediaItem[] }) {
  const { setNodeRef: setDropRef } = useDroppable({ id: cue.id })
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: cue.id,
    data: { type: "cue", cue },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : undefined,
  }

  return (
    <div ref={(node) => { setDropRef(node); setDragRef(node) }} style={style}>
      <CueRow cue={cue} totalCues={totalCues} onRemove={onRemove} onUpdateCue={onUpdateCue} onDuplicate={onDuplicate} onMoveToTop={onMoveToTop} onMoveToBottom={onMoveToBottom} onToggleDisable={onToggleDisable} defaultImageDuration={defaultImageDuration} media={media} dragListeners={listeners} dragAttributes={attributes} />
    </div>
  )
}

function CueRow({ cue, totalCues, onRemove, onUpdateCue, onDuplicate, onMoveToTop, onMoveToBottom, onToggleDisable, defaultImageDuration, media, dragListeners, dragAttributes }: { cue: Cue; totalCues: number } & CueRowActions & { defaultImageDuration: number; media: MediaItem[]; dragListeners?: SyntheticListenerMap; dragAttributes?: DraggableAttributes }) {
  const [editingDuration, setEditingDuration] = useState(false)
  const [durationValue, setDurationValue] = useState(String(cue.durationOverride ?? ""))
  void totalCues

  const mediaItem = media.find((m) => m.id === cue.mediaItemId)
  const isImage = cue.mediaItemType === "image"

  const durationText = (() => {
    if (cue.durationOverride) {
      return `${Math.floor(cue.durationOverride / 60)}:${String(cue.durationOverride % 60).padStart(2, "0")}`
    }
    if (isImage && defaultImageDuration) {
      return `${defaultImageDuration}s`
    }
    return "Default"
  })()

  const durationSource = cue.durationOverride ? "override" : isImage ? "default" : null

  function handleDurationSave() {
    const seconds = parseInt(durationValue, 10)
    onUpdateCue({ ...cue, durationOverride: isNaN(seconds) || seconds <= 0 ? null : seconds })
    setEditingDuration(false)
  }

  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 border-b border-secondary hover:bg-primary_hover transition-colors ${cue.disabled ? "opacity-40" : ""}`}>
      {dragListeners && (
        <span {...dragListeners} {...dragAttributes} className="cursor-grab text-quaternary hover:text-secondary">
          <GripVertical className="size-4" />
        </span>
      )}
      <div className="size-8 shrink-0 rounded bg-secondary flex items-center justify-center overflow-hidden relative">
        {mediaItem?.thumbnail ? (
          <img src={mediaItem.thumbnail} alt={cue.mediaItemName} className="size-full object-cover" />
        ) : (
          <span className="text-tertiary *:size-4">{mediaTypeIcon[cue.mediaItemType]}</span>
        )}
        {mediaItem?.thumbnail && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/30 *:size-3.5 text-white">
            {mediaTypeIcon[cue.mediaItemType]}
          </span>
        )}
      </div>
      <Label.sm className={`flex-1 truncate ${cue.disabled ? "line-through" : ""}`}>{cue.mediaItemName}</Label.sm>
      {editingDuration ? (
        <div className="w-20">
          <Input
            value={durationValue}
            onChange={(e) => setDurationValue(e.target.value)}
            placeholder="sec"
            onBlur={handleDurationSave}
            onKeyDown={(e) => e.key === "Enter" && handleDurationSave()}
            className="!py-0.5 !px-1.5"
          />
        </div>
      ) : isImage ? (
        <button
          onClick={() => { setEditingDuration(true); setDurationValue(String(cue.durationOverride ?? "")) }}
          className="flex items-center gap-1 cursor-pointer text-tertiary hover:text-secondary transition-colors"
        >
          <Clock className="size-3" />
          <Paragraph.xs>{durationText}</Paragraph.xs>
          {durationSource && <Paragraph.xs className="text-quaternary">({durationSource})</Paragraph.xs>}
        </button>
      ) : (
        <Paragraph.xs className="text-tertiary w-16 text-right">{durationText}</Paragraph.xs>
      )}
      <Dropdown>
        <Dropdown.Trigger>
          <button className="p-0.5 rounded hover:bg-secondary cursor-pointer text-quaternary hover:text-secondary transition-colors">
            <MoreVertical className="size-4" />
          </button>
        </Dropdown.Trigger>
        <Dropdown.Panel>
          <Dropdown.Item onClick={() => { setEditingDuration(true); setDurationValue(String(cue.durationOverride ?? "")) }}>
            <Clock className="size-4" />
            Set Duration
          </Dropdown.Item>
          <Dropdown.Item onClick={() => onDuplicate(cue.id)}>
            <Copy className="size-4" />
            Duplicate
          </Dropdown.Item>
          <Dropdown.Item onClick={() => onMoveToTop(cue.id)}>
            <ArrowUpToLine className="size-4" />
            Move to Top
          </Dropdown.Item>
          <Dropdown.Item onClick={() => onMoveToBottom(cue.id)}>
            <ArrowDownToLine className="size-4" />
            Move to Bottom
          </Dropdown.Item>
          <Dropdown.Item onClick={() => onToggleDisable(cue.id)}>
            {cue.disabled ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            {cue.disabled ? "Enable" : "Skip"}
          </Dropdown.Item>
          <Dropdown.Separator />
          <Dropdown.Item onClick={() => onRemove(cue.id)}>
            <Trash2 className="size-4 text-error" />
            <span className="text-error">Remove</span>
          </Dropdown.Item>
        </Dropdown.Panel>
      </Dropdown>
    </div>
  )
}
