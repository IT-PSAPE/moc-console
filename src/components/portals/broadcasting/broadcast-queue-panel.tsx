import { GripVertical, Trash2 } from 'lucide-react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { StatusBadge } from '@/components/ui/status-badge'
import {
  MEDIA_ICONS,
  QUEUE_DROPZONE_ID,
  getMediaItemFromQueue,
  useBroadcastWorkspaceContext,
} from './broadcast-workspace-context'
import type { MediaItem, QueueItem } from '@/types'

function QueueRow({ item, onRemove, onSelect }: { item: QueueItem; onRemove: (queueItemId: string) => void; onSelect: (mediaItem: MediaItem | null) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { queueItemId: item.id, type: 'queue-item' },
  })
  const mediaItem = getMediaItemFromQueue(item)
  const mediaType = mediaItem?.type ?? 'video'
  const Icon = MEDIA_ICONS[mediaType]

  function handleRemoveClick() {
    onRemove(item.id)
  }

  function handleSelectClick() {
    onSelect(mediaItem)
  }

  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-border-secondary bg-background-primary p-3 shadow-sm"
      ref={setNodeRef}
      style={{
        opacity: isDragging ? 0.5 : 1,
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="Reorder queue item"
        className="cursor-grab text-text-quaternary active:cursor-grabbing"
        type="button"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={handleSelectClick} type="button">
        <div className="flex h-12 w-18 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background-secondary">
          {mediaItem?.thumbnail_url ? (
            <img alt={mediaItem.title} className="h-full w-full object-cover" src={mediaItem.thumbnail_url} />
          ) : (
            <Icon className="h-5 w-5 text-text-quaternary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text-primary">{mediaItem?.title ?? 'Unknown media'}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge status={mediaType} />
            {item.config.duration && <span className="text-xs text-text-quaternary">{item.config.duration}s</span>}
            {item.config.repeat_count && <span className="text-xs text-text-quaternary">x{item.config.repeat_count + 1}</span>}
          </div>
        </div>
      </button>
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-background-secondary text-xs font-medium text-text-secondary">
          {item.display_order}
        </span>
        <button
          aria-label="Remove queue item"
          className="rounded-lg p-2 text-text-quaternary transition-colors hover:bg-background-secondary hover:text-utility-error-600"
          onClick={handleRemoveClick}
          type="button"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export function BroadcastQueuePanel() {
  const {
    state: { queue, selectedBroadcastId },
    actions: { removeQueueItem, selectMedia },
  } = useBroadcastWorkspaceContext()
  const { isOver, setNodeRef } = useDroppable({ id: QUEUE_DROPZONE_ID })

  return (
    <section className="rounded-2xl border border-border-secondary bg-background-primary p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Broadcast Queue</h2>
          <p className="mt-1 text-sm text-text-tertiary">Drop media here, then reorder the sequence before going live.</p>
        </div>
        <div className="rounded-full bg-background-secondary px-3 py-1 text-xs font-medium text-text-secondary">
          {queue.length} item{queue.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div
        className={`mt-4 rounded-2xl border border-dashed p-3 transition-colors ${
          isOver ? 'border-border-brand bg-background-brand_primary' : 'border-border-secondary bg-background-secondary/40'
        }`}
        ref={setNodeRef}
      >
        {queue.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-text-tertiary">
            Drag media from the bin into this queue for broadcast {selectedBroadcastId ? 'assignment' : 'management'}.
          </div>
        ) : (
          <SortableContext items={queue.map((item) => item.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {queue.map((item) => (
                <QueueRow item={item} key={item.id} onRemove={removeQueueItem} onSelect={selectMedia} />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </section>
  )
}
