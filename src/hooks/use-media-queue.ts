import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { mockMediaItems, mockQueueItems } from '@/lib/mock-media'
import type { MediaItem, QueueItem } from '@/types'

function fetchMediaLibrary(): Promise<MediaItem[]> {
  return Promise.resolve([...mockMediaItems])
}

function fetchQueue(): Promise<QueueItem[]> {
  return Promise.resolve([...mockQueueItems].sort((a, b) => a.display_order - b.display_order))
}

function reorderQueue(orderedIds: string[]): Promise<QueueItem[]> {
  orderedIds.forEach((id, index) => {
    const item = mockQueueItems.find((q) => q.id === id)
    if (item) item.display_order = index + 1
  })
  return Promise.resolve([...mockQueueItems].sort((a, b) => a.display_order - b.display_order))
}

function addToQueue(mediaItemId: string): Promise<QueueItem> {
  const maxOrder = mockQueueItems.reduce((max, q) => Math.max(max, q.display_order), 0)
  const mediaItem = mockMediaItems.find((m) => m.id === mediaItemId)
  const newItem: QueueItem = {
    id: `queue-${Date.now()}`,
    media_item_id: mediaItemId,
    media_item: mediaItem,
    display_order: maxOrder + 1,
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

export function useMediaQueue() {
  return useQuery({
    queryKey: queryKeys.media.queue(),
    queryFn: fetchQueue,
  })
}

export function useReorderQueue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: reorderQueue,
    onMutate: async (orderedIds: string[]) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.media.queue() })
      const previous = queryClient.getQueryData<QueueItem[]>(queryKeys.media.queue())
      if (previous) {
        const reordered = orderedIds.map((id, index) => {
          const item = previous.find((q) => q.id === id)!
          return { ...item, display_order: index + 1 }
        })
        queryClient.setQueryData(queryKeys.media.queue(), reordered)
      }
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.media.queue(), context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.media.queue() })
    },
  })
}

export function useAddToQueue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: addToQueue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.media.queue() })
    },
  })
}

export function useRemoveFromQueue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: removeFromQueue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.media.queue() })
    },
  })
}
