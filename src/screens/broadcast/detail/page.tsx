import { useCallback, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Card } from "@/components/display/card"
import { Header } from "@/components/display/header"
import { Badge } from "@/components/display/badge"
import { Button } from "@/components/controls/button"
import { Input } from "@/components/form/input"
import { Label, Paragraph, Title } from "@/components/display/text"
import { Divider } from "@/components/display/divider"
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
import { updatePlaylistCues } from "@/data/mutate-broadcast"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import {
  Radio, Search, Trash2, MoreVertical, Clock, Image, Music, Video, Layers,
  EllipsisVertical, Loader, FileText, ListMusic, Check,
} from "lucide-react"
import { routes } from "@/screens/console-routes"

const mediaTypeIcon: Record<MediaType, React.ReactNode> = {
  image: <Image />,
  audio: <Music />,
  video: <Video />,
  slide: <Layers />,
}

const allStatuses: PlaylistStatus[] = ["draft", "active"]

export function PlaylistDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useFeedback()
  const {
    state: { media },
    actions: { loadMedia },
  } = useBroadcast()

  const [playlist, setPlaylist] = useState<Playlist | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dragActiveItem, setDragActiveItem] = useState<MediaItem | null>(null)
  const [dropInsertIndex, setDropInsertIndex] = useState<number | null>(null)

  useBreadcrumbOverride(id ?? "", playlist?.name)

  useEffect(() => { loadMedia() }, [loadMedia])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    fetchPlaylistById(id).then((data) => {
      if (!cancelled) {
        setPlaylist(data ?? null)
        setIsLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [id])

  const mediaFilters = useMediaFilters(media)
  const { filtered: filteredMedia, setSearch, filters: mediaFilterState } = mediaFilters

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // ─── Property edits ─────────────────────────────────

  const updateField = useCallback(<K extends keyof Playlist>(field: K, value: Playlist[K]) => {
    setPlaylist((prev) => (prev ? { ...prev, [field]: value } : prev))
  }, [])

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

  // ─── Drag from media → queue ────────────────────────

  function handleDragStart(event: DragStartEvent) {
    const mediaItem = media.find((m) => m.id === event.active.id)
    if (mediaItem) setDragActiveItem(mediaItem)
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
    setDropInsertIndex(overIndex >= 0 ? overIndex : null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setDragActiveItem(null)
    setDropInsertIndex(null)

    if (!event.over || !playlist) return
    const mediaItem = media.find((m) => m.id === event.active.id)
    if (!mediaItem) return

    const insertAt = (() => {
      const overId = String(event.over!.id)
      if (overId === "queue-drop-zone") return playlist.cues.length
      const idx = playlist.cues.findIndex((c) => c.id === overId)
      return idx >= 0 ? idx : playlist.cues.length
    })()

    const newCue: Cue = {
      id: `cue-new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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

    updatePlaylistCues(playlist.id, renumbered).catch(() => {
      setPlaylist((prev) => (prev ? { ...prev, cues: previousCues } : prev))
      toast({ title: "Failed to save", description: "The cue could not be added. Please try again.", variant: "error" })
    })
  }

  function handleDragCancel() {
    setDragActiveItem(null)
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
              <Button variant="secondary" icon={<EllipsisVertical />} iconOnly />
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
            <Title.h5>{playlist.name}</Title.h5>
          </Header.Lead>
        </Header.Root>

        <div className="p-4 space-y-3">
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
                  <Dropdown.Item key={s} onSelect={() => updateField("status", s)}>
                    <span className="size-4 shrink-0 flex items-center justify-center">
                      {s === playlist.status && <Check className="size-3.5 text-brand_secondary" />}
                    </span>
                    {playlistStatusLabel[s]}
                  </Dropdown.Item>
                ))}
              </Dropdown.Panel>
            </Dropdown.Root>
          </MetaRow>

          <MetaRow icon={<FileText />} label="Name">
            <input
              className="all-unset w-full text-xs text-primary placeholder:text-quaternary"
              value={playlist.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="Playlist name"
            />
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

        <Divider className="px-4 my-2" />

        {/* Queue section — media left, cues right */}
        <div className="flex-1 min-h-0 flex gap-2 p-4 pt-2 mx-auto w-full max-w-content">
          {/* Left panel — media library (draggable items) */}
          <Card.Root className="w-80 shrink-0 flex flex-col overflow-hidden">
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
                  <DraggableMediaItem key={item.id} item={item} />
                ))}
            </Card.Content>
          </Card.Root>

          {/* Right panel — cue queue (droppable zone) */}
          <Card.Root className="flex-1 min-w-0 flex flex-col overflow-hidden">
            <Card.Header className="gap-2 justify-between">
              <div className="flex items-center gap-2">
                <ListMusic className="size-4 text-tertiary" />
                <Label.sm>Queue</Label.sm>
              </div>
              <Label.xs className="text-tertiary shrink-0">
                {playlist.cues.length} cue{playlist.cues.length !== 1 ? "s" : ""}
              </Label.xs>
            </Card.Header>
            <Card.Content className="flex-1 overflow-y-auto">
              <QueueDropZone
                cues={playlist.cues}
                dropInsertIndex={dropInsertIndex}
                isDraggingMedia={!!dragActiveItem}
                onRemove={handleRemoveCue}
                onUpdateCue={handleUpdateCue}
              />
            </Card.Content>
          </Card.Root>
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {dragActiveItem && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-brand bg-primary shadow-lg opacity-90">
              <span className="*:size-4 text-tertiary">{mediaTypeIcon[dragActiveItem.type]}</span>
              <Label.sm className="truncate">{dragActiveItem.name}</Label.sm>
            </div>
          )}
        </DragOverlay>
      </section>
    </DndContext>
  )
}

// ─── Draggable Media Item ─────────────────────────────

function DraggableMediaItem({ item }: { item: MediaItem }) {
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
    </div>
  )
}

// ─── Queue Drop Zone ──────────────────────────────────

function QueueDropZone({
  cues,
  dropInsertIndex,
  isDraggingMedia,
  onRemove,
  onUpdateCue,
}: {
  cues: Cue[]
  dropInsertIndex: number | null
  isDraggingMedia: boolean
  onRemove: (cueId: string) => void
  onUpdateCue: (cue: Cue) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "queue-drop-zone" })

  if (cues.length === 0) {
    return (
      <div
        ref={setNodeRef}
        className={`flex items-center justify-center py-12 transition-colors rounded-md ${
          isOver && isDraggingMedia ? "bg-brand_secondary border-2 border-dashed border-brand" : ""
        }`}
      >
        <Paragraph.sm className="text-tertiary">
          {isDraggingMedia ? "Drop here to add" : "No cues added yet. Drag media items here to build your queue."}
        </Paragraph.sm>
      </div>
    )
  }

  return (
    <div ref={setNodeRef} className="flex flex-col min-h-full">
      {cues.map((cue, index) => (
        <div key={cue.id}>
          {isDraggingMedia && dropInsertIndex === index && <DropIndicatorLine />}
          <DroppableCueRow cue={cue} onRemove={onRemove} onUpdateCue={onUpdateCue} />
        </div>
      ))}
      {isDraggingMedia && dropInsertIndex === cues.length && <DropIndicatorLine />}
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

function DroppableCueRow({ cue, onRemove, onUpdateCue }: { cue: Cue; onRemove: (id: string) => void; onUpdateCue: (cue: Cue) => void }) {
  const { setNodeRef } = useDroppable({ id: cue.id })

  return (
    <div ref={setNodeRef}>
      <CueRow cue={cue} onRemove={onRemove} onUpdateCue={onUpdateCue} />
    </div>
  )
}

function CueRow({ cue, onRemove, onUpdateCue }: { cue: Cue; onRemove: (id: string) => void; onUpdateCue: (cue: Cue) => void }) {
  const [editingDuration, setEditingDuration] = useState(false)
  const [durationValue, setDurationValue] = useState(String(cue.durationOverride ?? ""))

  const durationText = cue.durationOverride
    ? `${Math.floor(cue.durationOverride / 60)}:${String(cue.durationOverride % 60).padStart(2, "0")}`
    : "Default"

  function handleDurationSave() {
    const seconds = parseInt(durationValue, 10)
    onUpdateCue({ ...cue, durationOverride: isNaN(seconds) || seconds <= 0 ? null : seconds })
    setEditingDuration(false)
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 border-b border-secondary hover:bg-primary_hover transition-colors">
      <span className="size-6 shrink-0 rounded-full bg-secondary flex items-center justify-center">
        <Label.xs>{cue.order}</Label.xs>
      </span>
      <Label.sm className="flex-1 truncate">{cue.mediaItemName}</Label.sm>
      <Badge label={mediaTypeLabel[cue.mediaItemType]} color={mediaTypeColor[cue.mediaItemType]} />
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
          <Dropdown.Item onClick={() => onRemove(cue.id)}>
            <Trash2 className="size-4 text-error" />
            <span className="text-error">Remove</span>
          </Dropdown.Item>
        </Dropdown.Panel>
      </Dropdown.Root>
    </div>
  )
}
