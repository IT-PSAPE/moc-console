import { Film, Image, Music, Layers, GripVertical, Trash2 } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { useMediaQueue, useReorderQueue, useRemoveFromQueue } from '@/hooks/use-media-queue'
import type { MediaType, QueueItem } from '@/types'

const MEDIA_ICONS: Record<MediaType, typeof Film> = {
  video: Film,
  image: Image,
  audio: Music,
  slides: Layers,
}

interface SortableRowProps {
  item: QueueItem
  onRemove: (id: string) => void
}

function SortableRow({ item, onRemove }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const mediaItem = item.media_item
  const type = mediaItem?.type ?? 'video'
  const Icon = MEDIA_ICONS[type]

  function handleRemove() {
    onRemove(item.id)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-xl border border-border-secondary bg-background-primary p-3 shadow-sm"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-text-quaternary hover:text-text-tertiary active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background-secondary">
        {mediaItem?.thumbnail_url ? (
          <img src={mediaItem.thumbnail_url} alt={mediaItem.title} className="h-full w-full object-cover" />
        ) : (
          <Icon className="h-6 w-6 text-text-quaternary" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">
          {mediaItem?.title ?? 'Unknown media'}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <StatusBadge status={type} />
          {item.config.duration && (
            <span className="text-xs text-text-quaternary">{item.config.duration}s</span>
          )}
          {item.config.repeat_count && (
            <span className="text-xs text-text-quaternary">×{item.config.repeat_count + 1}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-background-secondary text-xs font-medium text-text-tertiary">
          {item.display_order}
        </span>
        <button
          onClick={handleRemove}
          className="rounded-lg p-1.5 text-text-quaternary hover:bg-background-secondary hover:text-utility-error-600"
          aria-label="Remove from queue"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

export function MediaQueue() {
  const { data: queue = [] } = useMediaQueue()
  const { mutate: reorderQueue } = useReorderQueue()
  const { mutate: removeFromQueue } = useRemoveFromQueue()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = queue.findIndex((q) => q.id === active.id)
    const newIndex = queue.findIndex((q) => q.id === over.id)
    const reordered = arrayMove(queue, oldIndex, newIndex)
    reorderQueue(reordered.map((q) => q.id))
  }

  function handleRemove(id: string) {
    removeFromQueue(id)
  }

  if (queue.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border-secondary">
        <p className="text-sm text-text-quaternary">Queue is empty — add items from the Media Library</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-text-tertiary">{queue.length} item{queue.length !== 1 ? 's' : ''} in queue</p>
        <Button variant="secondary" size="sm">Preview Queue</Button>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={queue.map((q) => q.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {queue.map((item) => (
              <SortableRow key={item.id} item={item} onRemove={handleRemove} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
