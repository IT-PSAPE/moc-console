import { createContext, useContext, type ReactNode } from 'react'
import { Film, Image, Layers, Music } from 'lucide-react'
import type { DragEndEvent } from '@dnd-kit/core'
import type { Broadcast, FilterConfig, MediaItem, MediaType, QueueItem } from '@/types'

export type DragItemType = 'media-item' | 'queue-item'

export interface BroadcastWorkspaceState {
  activeBroadcast: Broadcast | null
  broadcasts: Broadcast[]
  filteredMedia: MediaItem[]
  mediaFilters: Record<string, string[]>
  mediaSearch: string
  queue: QueueItem[]
  selectedBroadcastId: string
  selectedMedia: MediaItem | null
}

export interface BroadcastWorkspaceActions {
  addMediaToQueue: (mediaItemId: string) => void
  clearMediaFilters: () => void
  handleMediaFilterChange: (key: string, value: string) => void
  handleMediaSearchChange: (value: string) => void
  removeQueueItem: (queueItemId: string) => void
  selectBroadcast: (broadcastId: string) => void
  selectMedia: (mediaItem: MediaItem | null) => void
}

export interface BroadcastWorkspaceMeta {
  mediaTypeFilters: FilterConfig[]
}

export interface BroadcastWorkspaceContextValue {
  state: BroadcastWorkspaceState
  actions: BroadcastWorkspaceActions
  meta: BroadcastWorkspaceMeta
}

export const MEDIA_ICONS: Record<MediaType, typeof Film> = {
  audio: Music,
  image: Image,
  slides: Layers,
  video: Film,
}

export const MEDIA_FILTERS: FilterConfig[] = [
  {
    key: 'type',
    label: 'Type',
    options: [
      { label: 'Video', value: 'video' },
      { label: 'Image', value: 'image' },
      { label: 'Audio', value: 'audio' },
      { label: 'Slides', value: 'slides' },
    ],
  },
]

export const MEDIA_SEARCH_FIELDS: (keyof MediaItem)[] = ['title', 'type']
export const QUEUE_DROPZONE_ID = 'broadcast-workspace-queue'

const BroadcastWorkspaceContext = createContext<BroadcastWorkspaceContextValue | null>(null)

export function useBroadcastWorkspaceContext() {
  const context = useContext(BroadcastWorkspaceContext)
  if (!context) {
    throw new Error('BroadcastWorkspace compounds must be used within BroadcastWorkspace.Root')
  }
  return context
}

export function BroadcastWorkspaceProvider({ children, value }: { children: ReactNode; value: BroadcastWorkspaceContextValue }) {
  return <BroadcastWorkspaceContext.Provider value={value}>{children}</BroadcastWorkspaceContext.Provider>
}

export function getMediaItemFromQueue(queueItem: QueueItem | undefined) {
  return queueItem?.media_item ?? null
}

export function getDragType(event: DragEndEvent, key: 'active' | 'over') {
  const data = key === 'active' ? event.active.data.current : event.over?.data.current
  return data?.type as DragItemType | undefined
}
