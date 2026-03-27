import { Film, Image, Music, Layers, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/components/ui/search-input'
import { StatusBadge } from '@/components/ui/status-badge'
import { useListFilter } from '@/hooks/use-list-filter'
import { useMediaLibrary, useAddToQueue } from '@/hooks/use-media-queue'
import type { MediaItem, MediaType } from '@/types'

const MEDIA_ICONS: Record<MediaType, typeof Film> = {
  video: Film,
  image: Image,
  audio: Music,
  slides: Layers,
}

const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  video: 'Video',
  image: 'Image',
  audio: 'Audio',
  slides: 'Slides',
}

const SEARCH_FIELDS: (keyof MediaItem)[] = ['title', 'type']

interface MediaCardProps {
  item: MediaItem
  onAddToQueue: (id: string) => void
}

function MediaCard({ item, onAddToQueue }: MediaCardProps) {
  const Icon = MEDIA_ICONS[item.type]

  function handleAdd() {
    onAddToQueue(item.id)
  }

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border-secondary bg-background-primary transition-shadow hover:shadow-md">
      <div className="relative aspect-video w-full overflow-hidden bg-background-secondary">
        {item.thumbnail_url ? (
          <img src={item.thumbnail_url} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon className="h-10 w-10 text-text-quaternary" />
          </div>
        )}
        <div className="absolute top-2 left-2">
          <StatusBadge status={item.type} />
        </div>
      </div>
      <div className="p-3">
        <p className="text-sm font-medium text-text-primary truncate">{item.title}</p>
        <p className="mt-0.5 text-xs text-text-quaternary">{MEDIA_TYPE_LABELS[item.type]}</p>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex justify-end bg-gradient-to-t from-background-primary/90 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
        <Button variant="primary" size="sm" onClick={handleAdd}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add to Queue
        </Button>
      </div>
    </div>
  )
}

export function MediaLibrary() {
  const { data: items = [] } = useMediaLibrary()
  const { mutate: addToQueue } = useAddToQueue()

  const { search, setSearch, filtered } = useListFilter({
    data: items,
    searchFields: SEARCH_FIELDS,
  })

  function handleAddToQueue(id: string) {
    addToQueue(id)
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="w-full max-w-xs">
          <SearchInput value={search} onChange={setSearch} placeholder="Search media..." />
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-border-secondary">
          <p className="text-sm text-text-quaternary">No media items found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => (
            <MediaCard key={item.id} item={item} onAddToQueue={handleAddToQueue} />
          ))}
        </div>
      )}
    </div>
  )
}
