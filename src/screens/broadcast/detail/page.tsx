import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { Card } from "@/components/display/card"
import { Header } from "@/components/display/header"
import { Badge } from "@/components/display/badge"
import { Button } from "@/components/controls/button"
import { Input } from "@/components/form/input"
import { InlineEditableText } from "@/components/form/inline-editable-text"
import { Label, Paragraph, Title } from "@/components/display/text"
import { Divider } from "@/components/display/divider"
import { Accordion } from "@/components/display/accordion"
import { MetaRow } from "@/components/display/meta-row"
import { Spinner } from "@/components/feedback/spinner"
import { EmptyState } from "@/components/feedback/empty-state"
import { useFeedback } from "@/components/feedback/feedback-provider"
import { useBreadcrumbOverride } from "@/components/navigation/breadcrumb"
import { TopBarActions } from "@/features/topbar"
import { useBroadcast } from "@/features/broadcast/broadcast-provider"
import { useMediaFilters } from "@/features/broadcast/use-media-filters"
import { Dropdown } from "@/components/overlays/dropdown"
import { playlistStatusColor, playlistStatusLabel, mediaTypeColor, mediaTypeLabel } from "@/types/broadcast"
import type { Playlist, Cue, MediaItem, MediaType, PlaylistStatus } from "@/types/broadcast"
import { fetchPlaylistById } from "@/data/fetch-broadcast"
import { updatePlaylist, updatePlaylistCues } from "@/data/mutate-broadcast"
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
} from "lucide-react"
import { routes } from "@/screens/console-routes"
import { getErrorMessage } from "@/utils/get-error-message"

const mediaTypeIcon: Record<MediaType, React.ReactNode> = {
  image: <Image />,
  audio: <Music />,
  video: <Video />,
}

const allStatuses: PlaylistStatus[] = ["draft", "published"]

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
        setPlaylist(fromContext)
        setIsLoading(false)
      }, 0)
      return () => { window.clearTimeout(timerId) }
    }
    let cancelled = false
    fetchPlaylistById(id).then((data) => {
      if (!cancelled) {
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

  const syncPlaylistUpdate = useCallback((updated: Playlist) => {
    const previousPlaylist = playlist

    if (!previousPlaylist) {
      return
    }

    setPlaylist(updated)
    syncPlaylist(updated)
    updatePlaylist(updated)
      .then((savedPlaylist) => {
        setPlaylist(savedPlaylist)
        syncPlaylist(savedPlaylist)
      })
      .catch((error) => {
        setPlaylist(previousPlaylist)
        syncPlaylist(previousPlaylist)
        toast({ title: "Failed to save", description: getErrorMessage(error, "The playlist could not be updated."), variant: "error" })
      })
  }, [playlist, syncPlaylist, toast])

  const handleNameSave = useCallback((name: string) => {
    if (!playlist) return
    syncPlaylistUpdate({ ...playlist, name })
  }, [playlist, syncPlaylistUpdate])

  const handleStatusChange = useCallback((status: PlaylistStatus) => {
    if (!playlist) return
    syncPlaylistUpdate({ ...playlist, status })
  }, [playlist, syncPlaylistUpdate])

  // ─── Add media to queue ─────────────────────────────

  const handleAddMediaToQueue = useCallback((item: MediaItem) => {
    if (!playlist) return
    const newCue: Cue = {
      id: crypto.randomUUID(),
      mediaItemId: item.id,
      mediaItemName: item.name,
      mediaItemType: item.type,
      order: playlist.cues.length + 1,
      durationOverride: null,
    }
    const newCues = [...playlist.cues, newCue]
    const previousCues = playlist.cues
    setPlaylist((prev) => (prev ? { ...prev, cues: newCues } : prev))
    updatePlaylistCues(playlist.id, newCues).catch((error) => {
      setPlaylist((prev) => (prev ? { ...prev, cues: previousCues } : prev))
      toast({ title: "Failed to save", description: getErrorMessage(error, "The cue could not be added."), variant: "error" })
    })
  }, [playlist, toast])

  // ─── Cue mutations ──────────────────────────────────

  const handleRemoveCue = useCallback((cueId: string) => {
    setPlaylist((prev) => {
      if (!prev) return prev
      const cues = prev.cues
        .filter((c) => c.id !== cueId)
        .map((c, i) => ({ ...c, order: i + 1 }))
      return { ...prev, cues }
    })
  }, [])

  const handleUpdateCue = useCallback((updatedCue: Cue) => {
    setPlaylist((prev) => {
      if (!prev) return prev
      const cues = prev.cues.map((c) => c.id === updatedCue.id ? updatedCue : c)
      return { ...prev, cues }
    })
  }, [])

  const handleDuplicateCue = useCallback((cueId: string) => {
    setPlaylist((prev) => {
      if (!prev) return prev
      const idx = prev.cues.findIndex((c) => c.id === cueId)
      if (idx === -1) return prev
      const original = prev.cues[idx]
      const clone: Cue = {
        ...original,
        id: crypto.randomUUID(),
      }
      const newCues = [...prev.cues]
      newCues.splice(idx + 1, 0, clone)
      return { ...prev, cues: newCues.map((c, i) => ({ ...c, order: i + 1 })) }
    })
  }, [])

  const handleMoveToTop = useCallback((cueId: string) => {
    setPlaylist((prev) => {
      if (!prev) return prev
      const idx = prev.cues.findIndex((c) => c.id === cueId)
      if (idx <= 0) return prev
      const cues = [...prev.cues]
      const [moved] = cues.splice(idx, 1)
      cues.unshift(moved)
      return { ...prev, cues: cues.map((c, i) => ({ ...c, order: i + 1 })) }
    })
  }, [])

  const handleMoveToBottom = useCallback((cueId: string) => {
    setPlaylist((prev) => {
      if (!prev) return prev
      const idx = prev.cues.findIndex((c) => c.id === cueId)
      if (idx === -1 || idx === prev.cues.length - 1) return prev
      const cues = [...prev.cues]
      const [moved] = cues.splice(idx, 1)
      cues.push(moved)
      return { ...prev, cues: cues.map((c, i) => ({ ...c, order: i + 1 })) }
    })
  }, [])

  const handleToggleDisable = useCallback((cueId: string) => {
    setPlaylist((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        cues: prev.cues.map((c) => c.id === cueId ? { ...c, disabled: !c.disabled } : c),
      }
    })
  }, [])

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

      const previousCues = playlist.cues
      const reordered = [...playlist.cues]
      const [moved] = reordered.splice(activeCueIndex, 1)
      reordered.splice(overIndex, 0, moved)
      const renumbered = reordered.map((c, i) => ({ ...c, order: i + 1 }))

      setPlaylist((prev) => (prev ? { ...prev, cues: renumbered } : prev))

      updatePlaylistCues(playlist.id, renumbered).catch((error) => {
        setPlaylist((prev) => (prev ? { ...prev, cues: previousCues } : prev))
        toast({ title: "Failed to save", description: getErrorMessage(error, "The cue order could not be updated."), variant: "error" })
      })
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
      id: crypto.randomUUID(),
      mediaItemId: mediaItem.id,
      mediaItemName: mediaItem.name,
      mediaItemType: mediaItem.type,
      order: insertAt + 1,
      durationOverride: null,
    }

    const previousCues = playlist.cues
    const newCues = [...playlist.cues]
    newCues.splice(insertAt, 0, newCue)
    const renumbered = newCues.map((c, i) => ({ ...c, order: i + 1 }))

    setPlaylist((prev) => (prev ? { ...prev, cues: renumbered } : prev))

    updatePlaylistCues(playlist.id, renumbered).catch((error) => {
      setPlaylist((prev) => (prev ? { ...prev, cues: previousCues } : prev))
      toast({ title: "Failed to save", description: getErrorMessage(error, "The cue could not be added."), variant: "error" })
    })
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
      <section className="mx-auto max-w-content-sm">
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
          <Dropdown.Root placement="bottom">
            <Dropdown.Trigger>
              <Button.Icon variant="secondary" icon={<EllipsisVertical />} />
            </Dropdown.Trigger>
            <Dropdown.Panel>
              <Dropdown.Item onSelect={() => navigate(`/${routes.broadcastPlaylists}`)}>
                <ListMusic className="size-4" />
                Back to Playlists
              </Dropdown.Item>
            </Dropdown.Panel>
          </Dropdown.Root>
        </TopBarActions>

        <Header.Root className="px-4 pt-12">
          <Header.Lead className="gap-2">
            <Title.h5>
              <InlineEditableText value={playlist.name} onSave={handleNameSave} placeholder="Untitled" autoEdit={isNew} />
            </Title.h5>
          </Header.Lead>
        </Header.Root>

        <Accordion.Root type="single" defaultValue="details" className="px-4">
          <Accordion.Item value="details">
            <Accordion.Trigger className="flex items-center gap-2 py-2">
              <Label.sm>Details</Label.sm>
              <ChevronDown className="size-3.5 text-tertiary transition-transform data-[state=open]:rotate-180" />
            </Accordion.Trigger>
            <Accordion.Content>
              <div className="space-y-3 pb-3">
                <MetaRow icon={<Loader />} label="Status">
                  <Dropdown.Root placement="bottom">
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
                  </Dropdown.Root>
                </MetaRow>

                <MetaRow icon={<FileText />} label="Description">
                  <textarea
                    className="all-unset w-full text-xs text-primary placeholder:text-quaternary resize-none"
                    rows={2}
                    value={playlist.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    placeholder="Describe this playlist..."
                  />
                </MetaRow>
              </div>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion.Root>

        <Divider className="px-4 my-2" />

        {/* Queue section — media left, cues right */}
        <div className="flex-1 min-h-0 flex gap-2 p-4 pt-2 mx-auto w-full max-w-content max-mobile:flex-col">
          {/* Left panel — media library (draggable items) */}
          <div ref={mediaPanelRef} className="w-80 shrink-0 flex flex-col overflow-hidden max-mobile:w-full max-mobile:shrink max-mobile:h-64">
            <Card.Root className="flex-1 flex flex-col overflow-hidden">
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
            </Card.Root>
          </div>

          {/* Right panel — cue queue + playback settings */}
          <div className="flex-1 min-w-0 flex flex-col gap-2 overflow-hidden max-mobile:min-h-0">
            <Card.Root className="flex-1 min-h-0 flex flex-col overflow-hidden">
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
            </Card.Root>

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
                        onClick={() => syncPlaylistUpdate({ ...playlist, backgroundMusicId: null, backgroundMusicUrl: null, backgroundMusicName: null })}
                        className="p-0.5 rounded hover:bg-secondary cursor-pointer text-quaternary hover:text-secondary transition-colors"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <Dropdown.Root placement="top">
                      <Dropdown.Trigger>
                        <Paragraph.xs className="text-quaternary cursor-pointer hover:text-secondary transition-colors">Select audio...</Paragraph.xs>
                      </Dropdown.Trigger>
                      <Dropdown.Panel>
                        {media.filter((m) => m.type === "audio").map((audioItem) => (
                          <Dropdown.Item
                            key={audioItem.id}
                            onSelect={() => syncPlaylistUpdate({
                              ...playlist,
                              backgroundMusicId: audioItem.id,
                              backgroundMusicUrl: audioItem.url,
                              backgroundMusicName: audioItem.name,
                            })}
                          >
                            <Music className="size-4" />
                            {audioItem.name}
                          </Dropdown.Item>
                        ))}
                        {media.filter((m) => m.type === "audio").length === 0 && (
                          <div className="px-2 py-1.5 text-sm text-quaternary">No audio items in library</div>
                        )}
                      </Dropdown.Panel>
                    </Dropdown.Root>
                  )}
                </div>

                {/* Defaults row — image duration */}
                <div className="flex items-center gap-4 px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <Image className="size-3.5 text-tertiary shrink-0" />
                    <Label.xs className="text-tertiary">Image</Label.xs>
                    <Input
                      value={String(playlist.defaultImageDuration)}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10)
                        if (!isNaN(val) && val > 0) updateField("defaultImageDuration", val)
                      }}
                      placeholder="sec"
                      className="!w-14 !py-0.5 !px-1.5"
                    />
                    <Paragraph.xs className="text-tertiary">s</Paragraph.xs>
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
      <Dropdown.Root>
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
      </Dropdown.Root>
    </div>
  )
}
