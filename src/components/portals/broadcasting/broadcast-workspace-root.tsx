import { useMemo, useState, type ReactNode } from 'react'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useAddToQueue, useMediaLibrary, useMediaQueue, useRemoveFromQueue, useReorderQueue } from '@/hooks/use-media-queue'
import { useListFilter } from '@/hooks/use-list-filter'
import { mockBroadcasts } from '@/lib/mock-broadcasts'
import {
  BroadcastWorkspaceProvider,
  MEDIA_FILTERS,
  MEDIA_SEARCH_FIELDS,
  getDragType,
} from './broadcast-workspace-context'
import type { MediaItem } from '@/types'

interface BroadcastWorkspaceRootProps {
  children: ReactNode
}

export function BroadcastWorkspaceRoot({ children }: BroadcastWorkspaceRootProps) {
  const broadcasts = mockBroadcasts
  const [selectedBroadcastId, setSelectedBroadcastId] = useState(broadcasts[0]?.id ?? '')
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null)
  const { data: mediaItems = [] } = useMediaLibrary()
  const { data: queue = [] } = useMediaQueue(selectedBroadcastId || undefined)
  const { mutate: addToQueue } = useAddToQueue()
  const { mutate: removeFromQueue } = useRemoveFromQueue()
  const { mutate: reorderQueue } = useReorderQueue()
  const { activeFilters, clearFilters, filtered, handleFilterChange, search, setSearch } = useListFilter({
    data: mediaItems,
    searchFields: MEDIA_SEARCH_FIELDS,
  })
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const activeBroadcast = useMemo(
    () => broadcasts.find((broadcast) => broadcast.id === selectedBroadcastId) ?? null,
    [broadcasts, selectedBroadcastId],
  )

  const selectedMedia = useMemo(() => {
    if (!selectedMediaId) {
      return null
    }

    return mediaItems.find((item) => item.id === selectedMediaId) ?? null
  }, [mediaItems, selectedMediaId])

  function selectBroadcast(broadcastId: string) {
    setSelectedBroadcastId(broadcastId)
    setSelectedMediaId(null)
  }

  function selectMedia(mediaItem: MediaItem | null) {
    setSelectedMediaId(mediaItem?.id ?? null)
  }

  function addMediaToQueue(mediaItemId: string) {
    addToQueue({ broadcastId: selectedBroadcastId || undefined, mediaItemId })
  }

  function removeQueueItem(queueItemId: string) {
    removeFromQueue(queueItemId)
  }

  function handleMediaSearchChange(value: string) {
    setSearch(value)
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over) {
      return
    }

    const activeType = getDragType(event, 'active')
    const overType = getDragType(event, 'over')

    if (activeType === 'media-item') {
      const mediaItemId = event.active.data.current?.mediaItemId as string | undefined
      const droppedInQueue = overType === 'queue-item' || String(event.over.id) === 'broadcast-workspace-queue'

      if (mediaItemId && droppedInQueue) {
        addMediaToQueue(mediaItemId)
        const mediaItem = mediaItems.find((item) => item.id === mediaItemId) ?? null
        selectMedia(mediaItem)
      }

      return
    }

    if (activeType !== 'queue-item' || overType !== 'queue-item' || event.active.id === event.over.id) {
      return
    }

    const oldIndex = queue.findIndex((item) => item.id === event.active.id)
    const newIndex = queue.findIndex((item) => item.id === event.over?.id)
    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    const reordered = arrayMove(queue, oldIndex, newIndex)
    reorderQueue({
      broadcastId: selectedBroadcastId || undefined,
      orderedIds: reordered.map((item) => item.id),
    })
  }

  return (
    <BroadcastWorkspaceProvider
      value={{
        state: {
          activeBroadcast,
          broadcasts,
          filteredMedia: filtered,
          mediaFilters: activeFilters,
          mediaSearch: search,
          queue,
          selectedBroadcastId,
          selectedMedia,
        },
        actions: {
          addMediaToQueue,
          clearMediaFilters: clearFilters,
          handleMediaFilterChange: handleFilterChange,
          handleMediaSearchChange,
          removeQueueItem,
          selectBroadcast,
          selectMedia,
        },
        meta: { mediaTypeFilters: MEDIA_FILTERS },
      }}
    >
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr_1.1fr]">
          {children}
        </div>
      </DndContext>
    </BroadcastWorkspaceProvider>
  )
}
