import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { mockMediaItems, mockQueueItems } from '@/lib/mock-media'
import type { MediaItem, QueueItem } from '@/types'

function fetchMediaLibrary(): Promise<MediaItem[]> {
  return Promise.resolve([...mockMediaItems])
}

function fetchQueue(broadcastId?: string): Promise<QueueItem[]> {
  const items = broadcastId
    ? mockQueueItems.filter((q) => q.broadcast_id === broadcastId)
    : [...mockQueueItems]
  return Promise.resolve(items.sort((a, b) => a.display_order - b.display_order))
}

function reorderQueue(params: { broadcastId?: string; orderedIds: string[] }): Promise<QueueItem[]> {
  const { broadcastId, orderedIds } = params

  orderedIds.forEach((id, index) => {
    const item = mockQueueItems.find((queueItem) => queueItem.id === id && queueItem.broadcast_id === broadcastId)
    if (item) item.display_order = index + 1
  })

  return fetchQueue(broadcastId)
}

function addToQueue(params: { mediaItemId: string; broadcastId?: string }): Promise<QueueItem> {
  const { mediaItemId, broadcastId } = params
  const broadcastItems = broadcastId
    ? mockQueueItems.filter((q) => q.broadcast_id === broadcastId)
    : mockQueueItems
  const maxOrder = broadcastItems.reduce((max, q) => Math.max(max, q.display_order), 0)
  const mediaItem = mockMediaItems.find((m) => m.id === mediaItemId)
  const newItem: QueueItem = {
    id: `queue-${Date.now()}`,
    media_item_id: mediaItemId,
    media_item: mediaItem,
    broadcast_id: broadcastId,
    display_order: maxOrder + 1,
    status: 'queued',
    config: {},
  }
  mockQueueItems.push(newItem)
  return Promise.resolve(newItem)
}

function removeFromQueue(queueItemId: string): Promise<void> {
  const index = mockQueueItems.findIndex((q) => q.id === queueItemId)
  if (index !== -1) mockQueueItems.splice(index, 1)
  return Promise.resolve()
}

export function useMediaLibrary() {
  return useQuery({
    queryKey: queryKeys.media.library(),
    queryFn: fetchMediaLibrary,
  })
}

export function useMediaQueue(broadcastId?: string) {
  return useQuery({
    queryKey: queryKeys.media.queue(broadcastId),
    queryFn: () => fetchQueue(broadcastId),
  })
}

export function useReorderQueue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: reorderQueue,
    onMutate: async ({ broadcastId, orderedIds }: { broadcastId?: string; orderedIds: string[] }) => {
      const queryKey = queryKeys.media.queue(broadcastId)

      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<QueueItem[]>(queryKey)
      if (previous) {
        const reordered = orderedIds.map((id, index) => {
          const item = previous.find((q) => q.id === id)!
          return { ...item, display_order: index + 1 }
        })
        queryClient.setQueryData(queryKey, reordered)
      }
      return { previous }
    },
    onError: (_err, variables, context) => {
      const queryKey = queryKeys.media.queue(variables.broadcastId)
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.media.queue(variables.broadcastId) })
    },
  })
}

export function useAddToQueue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: addToQueue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.media.all })
    },
  })
}

export function useRemoveFromQueue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: removeFromQueue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.media.all })
    },
  })
}
