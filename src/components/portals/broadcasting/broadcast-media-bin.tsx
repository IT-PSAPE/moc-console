import { GripVertical } from 'lucide-react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { FilterDrawer } from '@/components/ui/filter-drawer'
import { FilterSummary } from '@/components/ui/filter-summary'
import { SearchInput } from '@/components/ui/search-input'
import { useBroadcastWorkspaceContext, MEDIA_ICONS } from './broadcast-workspace-context'
import type { MediaItem } from '@/types'

function MediaBinItem({ item, onSelect }: { item: MediaItem; onSelect: (item: MediaItem) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `media-${item.id}`,
    data: { mediaItemId: item.id, type: 'media-item' },
  })
  const Icon = MEDIA_ICONS[item.type]

  function handleSelect() {
    onSelect(item)
  }

  return (
    <button
      {...attributes}
      {...listeners}
      className="flex w-full items-center gap-3 rounded-xl border border-border-secondary bg-background-primary p-3 text-left transition-colors hover:border-border-brand"
      onClick={handleSelect}
      ref={setNodeRef}
      style={{
        opacity: isDragging ? 0.4 : 1,
        transform: CSS.Translate.toString(transform),
      }}
      type="button"
    >
      <GripVertical className="h-4 w-4 shrink-0 text-text-quaternary" />
      <div className="flex h-12 w-18 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background-secondary">
        {item.thumbnail_url ? (
          <img alt={item.title} className="h-full w-full object-cover" src={item.thumbnail_url} />
        ) : (
          <Icon className="h-5 w-5 text-text-quaternary" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">{item.title}</p>
        <p className="mt-1 text-xs text-text-quaternary capitalize">{item.type}</p>
      </div>
    </button>
  )
}

export function BroadcastMediaBin() {
  const {
    state: { filteredMedia, mediaFilters, mediaSearch },
    actions: { clearMediaFilters, handleMediaFilterChange, handleMediaSearchChange, selectMedia },
    meta: { mediaTypeFilters },
  } = useBroadcastWorkspaceContext()

  return (
    <section className="rounded-2xl border border-border-secondary bg-background-primary p-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-text-primary">Media Bin</h2>
        <p className="text-sm text-text-tertiary">Browse available assets and drag any item into the broadcast queue.</p>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex flex-col gap-3">
          <SearchInput onChange={handleMediaSearchChange} placeholder="Search media..." value={mediaSearch} />
          <FilterDrawer activeFilters={mediaFilters} filters={mediaTypeFilters} onClearAll={clearMediaFilters} onFilterChange={handleMediaFilterChange} />
        </div>
        <FilterSummary activeFilters={mediaFilters} filters={mediaTypeFilters} onClearAll={clearMediaFilters} onRemove={handleMediaFilterChange} />
      </div>

      <div className="mt-4 space-y-3">
        {filteredMedia.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-secondary px-4 py-10 text-center text-sm text-text-tertiary">
            No media matches the current filters.
          </div>
        ) : (
          filteredMedia.map((item) => (
            <MediaBinItem item={item} key={item.id} onSelect={selectMedia} />
          ))
        )}
      </div>
    </section>
  )
}
