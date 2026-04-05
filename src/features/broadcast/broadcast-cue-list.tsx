import { useCallback, useState } from "react"
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter, type DragEndEvent, type DragStartEvent, type DragOverEvent } from "@dnd-kit/core"
import { useDraggable } from "@dnd-kit/core"
import { useDroppable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { Badge } from "@/components/display/badge"
import { Button } from "@/components/controls/button"
import { Dropdown } from "@/components/overlays/dropdown"
import { Label, Paragraph } from "@/components/display/text"
import { Input } from "@/components/form/input"
import { mediaTypeColor, mediaTypeLabel } from "@/types/broadcast/constants"
import type { Cue } from "@/types/broadcast/cue"
import { GripVertical, Trash2, MoreVertical, Clock } from "lucide-react"

type PlaylistCueListProps = {
  cues: Cue[]
  onReorder: (cues: Cue[]) => void
  onRemove: (cueId: string) => void
  onUpdateCue?: (cue: Cue) => void
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

export function PlaylistCueList({ cues, onReorder, onRemove, onUpdateCue }: PlaylistCueListProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const activeIndex = activeId ? cues.findIndex((c) => c.id === activeId) : -1

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragOver(event: DragOverEvent) {
    setOverId(event.over ? String(event.over.id) : null)
  }

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null)
      setOverId(null)

      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIndex = cues.findIndex((c) => c.id === active.id)
      const newIndex = cues.findIndex((c) => c.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return

      const reordered = [...cues]
      const [moved] = reordered.splice(oldIndex, 1)
      reordered.splice(newIndex, 0, moved)

      const renumbered = reordered.map((c, i) => ({ ...c, order: i + 1 }))
      onReorder(renumbered)
    },
    [cues, onReorder],
  )

  function handleDragCancel() {
    setActiveId(null)
    setOverId(null)
  }

  if (cues.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Paragraph.sm className="text-tertiary">No cues added yet. Add media items to build your playlist queue.</Paragraph.sm>
      </div>
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
      <div className="flex flex-col">
        {cues.map((cue, index) => {
          const isOverTarget = overId === cue.id && activeId && activeId !== cue.id
          const showAbove = isOverTarget && activeIndex > index
          const showBelow = isOverTarget && activeIndex < index

          return (
            <div key={cue.id} className="relative">
              {showAbove && <DropIndicatorLine />}
              <DroppableCueRow cue={cue} onRemove={onRemove} onUpdateCue={onUpdateCue} />
              {showBelow && <DropIndicatorLine />}
            </div>
          )
        })}
      </div>
    </DndContext>
  )
}

// ─── Droppable + Draggable Cue Row ────────────────────

function DroppableCueRow({ cue, onRemove, onUpdateCue }: { cue: Cue; onRemove: (id: string) => void; onUpdateCue?: (cue: Cue) => void }) {
  const { setNodeRef: setDropRef } = useDroppable({ id: cue.id })

  return (
    <div ref={setDropRef}>
      <DraggableCueRow cue={cue} onRemove={onRemove} onUpdateCue={onUpdateCue} />
    </div>
  )
}

function DraggableCueRow({ cue, onRemove, onUpdateCue }: { cue: Cue; onRemove: (id: string) => void; onUpdateCue?: (cue: Cue) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: cue.id,
    data: { cue },
  })
  const [editingDuration, setEditingDuration] = useState(false)
  const [durationValue, setDurationValue] = useState(String(cue.durationOverride ?? ""))

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : undefined,
  }

  const durationText = cue.durationOverride
    ? `${Math.floor(cue.durationOverride / 60)}:${String(cue.durationOverride % 60).padStart(2, "0")}`
    : "Default"

  function handleDurationSave() {
    const seconds = parseInt(durationValue, 10)
    onUpdateCue?.({ ...cue, durationOverride: isNaN(seconds) || seconds <= 0 ? null : seconds })
    setEditingDuration(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-3 py-2.5 border-b border-secondary hover:bg-primary_hover transition-colors"
    >
      {/* Drag handle */}
      <span {...listeners} {...attributes} className="cursor-grab text-quaternary hover:text-secondary">
        <GripVertical className="size-4" />
      </span>

      {/* Order number */}
      <span className="size-6 shrink-0 rounded-full bg-secondary flex items-center justify-center">
        <Label.xs>{cue.order}</Label.xs>
      </span>

      {/* Name */}
      <Label.sm className="flex-1 truncate">{cue.mediaItemName}</Label.sm>

      {/* Type badge */}
      <Badge label={mediaTypeLabel[cue.mediaItemType]} color={mediaTypeColor[cue.mediaItemType]} />

      {/* Duration */}
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

      {/* Options dropdown */}
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
