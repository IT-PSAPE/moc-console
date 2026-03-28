import { useState } from 'react'
import {
  Play,
  Pause,
  Square,
  SkipForward,
  ChevronLeft,
  GripVertical,
  Trash2,
  Plus,
  Film,
  Copy,
} from 'lucide-react'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { RecordCard } from '@/components/ui/record-card'
import { StatusBadge } from '@/components/ui/status-badge'
import { SearchInput } from '@/components/ui/search-input'
import { FilterDrawer } from '@/components/ui/filter-drawer'
import { FilterSummary } from '@/components/ui/filter-summary'
import { useListFilter } from '@/hooks/use-list-filter'
import { useMediaQueue, useMediaLibrary, useAddToQueue, useRemoveFromQueue, useReorderQueue } from '@/hooks/use-media-queue'
import { formatDateTime } from '@/lib/utils'
import { mockBroadcasts } from '@/lib/mock-broadcasts'
import { MEDIA_ICONS } from './broadcast-workspace-context'
import type { Broadcast, FilterConfig, QueueItem } from '@/types'

const FILTERS: FilterConfig[] = [
  {
    key: 'status',
    label: 'Status',
    options: [
      { label: 'Live', value: 'live' },
      { label: 'Scheduled', value: 'scheduled' },
      { label: 'Completed', value: 'completed' },
      { label: 'Draft', value: 'draft' },
      { label: 'Cancelled', value: 'cancelled' },
    ],
  },
  {
    key: 'channel',
    label: 'Channel',
    options: [
      { label: 'MOC Live', value: 'MOC Live' },
      { label: 'MOC Events', value: 'MOC Events' },
      { label: 'MOC Profiles', value: 'MOC Profiles' },
    ],
  },
]

const SEARCH_FIELDS: (keyof Broadcast)[] = ['title']

// ── Queue Row (Sortable) ────────────────────────────────────

function QueueRow({
  item,
  onRemove,
  onDuplicate,
}: {
  item: QueueItem
  onRemove: (id: string) => void
  onDuplicate: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { queueItemId: item.id, type: 'queue-item' },
  })
  const media = item.media_item
  const mediaType = media?.type ?? 'video'
  const Icon = MEDIA_ICONS[mediaType]

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border p-3 shadow-sm ${
        item.status === 'playing'
          ? 'border-utility-brand-300 bg-utility-brand-50'
          : item.status === 'completed'
            ? 'border-border-secondary bg-background-secondary/40 opacity-60'
            : 'border-border-secondary bg-background-primary'
      }`}
      ref={setNodeRef}
      style={{
        opacity: isDragging ? 0.5 : undefined,
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
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-background-secondary text-xs font-medium text-text-secondary">
        {item.display_order}
      </span>
      <div className="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background-secondary">
        {media?.thumbnail_url ? (
          <img alt={media.title} className="h-full w-full object-cover" src={media.thumbnail_url} />
        ) : (
          <Icon className="h-4 w-4 text-text-quaternary" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">{media?.title ?? 'Unknown'}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <StatusBadge status={item.status} />
          {item.config.duration && <span className="text-xs text-text-quaternary">{item.config.duration}s</span>}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          aria-label="Duplicate"
          className="rounded-lg p-1.5 text-text-quaternary transition-colors hover:bg-background-secondary hover:text-text-secondary"
          onClick={() => onDuplicate(item.id)}
          type="button"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          aria-label="Remove"
          className="rounded-lg p-1.5 text-text-quaternary transition-colors hover:bg-background-secondary hover:text-utility-error-600"
          onClick={() => onRemove(item.id)}
          type="button"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Broadcast Detail (Queue + Playback) ──────────────────────

function BroadcastDetail({ broadcast, onBack }: { broadcast: Broadcast; onBack: () => void }) {
  const { data: queue = [] } = useMediaQueue(broadcast.id)
  const { data: mediaItems = [] } = useMediaLibrary()
  const { mutate: addToQueue } = useAddToQueue()
  const { mutate: removeFromQueue } = useRemoveFromQueue()
  const { mutate: reorderQueue } = useReorderQueue()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const nowPlaying = queue.find((q) => q.status === 'playing') ?? null
  const upNext = queue.filter((q) => q.status === 'queued').slice(0, 2)

  function handleAddMedia(mediaItemId: string) {
    addToQueue({ broadcastId: broadcast.id, mediaItemId })
  }

  function handleRemoveItem(queueItemId: string) {
    removeFromQueue(queueItemId)
  }

  function handleDuplicate(queueItemId: string) {
    const original = queue.find((q) => q.id === queueItemId)
    if (original) {
      addToQueue({ broadcastId: broadcast.id, mediaItemId: original.media_item_id })
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return
    const oldIndex = queue.findIndex((item) => item.id === event.active.id)
    const newIndex = queue.findIndex((item) => item.id === event.over?.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(queue, oldIndex, newIndex)
    reorderQueue({
      broadcastId: broadcast.id,
      orderedIds: reordered.map((item) => item.id),
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          className="rounded-lg p-2 text-text-tertiary transition-colors hover:bg-background-secondary hover:text-text-primary"
          onClick={onBack}
          type="button"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-text-primary">{broadcast.title}</h2>
          <p className="text-sm text-text-tertiary">{broadcast.description}</p>
        </div>
        <StatusBadge status={broadcast.status} variant={broadcast.status === 'live' ? 'dot' : 'default'} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_0.8fr]">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-text-primary">Playback Queue</h3>
              <p className="mt-1 text-sm text-text-tertiary">{queue.length} item{queue.length !== 1 ? 's' : ''} in queue</p>
            </div>
            <div className="flex gap-2">
              {broadcast.status === 'live' ? (
                <>
                  <Button size="sm" variant="secondary" icon={<Pause className="h-4 w-4" />}>Pause</Button>
                  <Button size="sm" variant="secondary" icon={<Square className="h-4 w-4" />}>Stop</Button>
                  <Button size="sm" icon={<SkipForward className="h-4 w-4" />}>Next</Button>
                </>
              ) : (
                <Button size="sm" icon={<Play className="h-4 w-4" />}>Start Broadcast</Button>
              )}
            </div>
          </div>

          {nowPlaying && (
            <div className="rounded-xl border border-utility-brand-300 bg-utility-brand-50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-utility-brand-600">Now Playing</p>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex h-12 w-18 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background-primary">
                  {nowPlaying.media_item?.thumbnail_url ? (
                    <img alt={nowPlaying.media_item.title} className="h-full w-full object-cover" src={nowPlaying.media_item.thumbnail_url} />
                  ) : (
                    <Film className="h-5 w-5 text-text-quaternary" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{nowPlaying.media_item?.title ?? 'Unknown'}</p>
                  <p className="text-xs text-text-tertiary capitalize">{nowPlaying.media_item?.type}</p>
                </div>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-background-primary">
                <div className="h-full w-2/3 rounded-full bg-utility-brand-600 transition-all" />
              </div>
            </div>
          )}

          {upNext.length > 0 && (
            <div className="rounded-xl border border-border-secondary bg-background-secondary/40 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-text-quaternary">Up Next</p>
              <div className="mt-2 space-y-2">
                {upNext.map((item) => {
                  const Icon = item.media_item ? MEDIA_ICONS[item.media_item.type] : Film
                  return (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded-lg bg-background-primary">
                        {item.media_item?.thumbnail_url ? (
                          <img alt={item.media_item.title} className="h-full w-full object-cover rounded-lg" src={item.media_item.thumbnail_url} />
                        ) : (
                          <Icon className="h-4 w-4 text-text-quaternary" />
                        )}
                      </div>
                      <p className="truncate text-sm text-text-secondary">{item.media_item?.title ?? 'Unknown'}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
            <SortableContext items={queue.map((item) => item.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {queue.map((item) => (
                  <QueueRow key={item.id} item={item} onRemove={handleRemoveItem} onDuplicate={handleDuplicate} />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {queue.length === 0 && (
            <div className="rounded-xl border border-dashed border-border-secondary px-4 py-12 text-center text-sm text-text-tertiary">
              Queue is empty. Add media items from the library panel.
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border-secondary bg-background-primary p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">Add from Media Bin</h3>
          </div>
          <div className="mt-3 space-y-2">
            {mediaItems.slice(0, 8).map((item) => {
              const Icon = MEDIA_ICONS[item.type]
              return (
                <button
                  key={item.id}
                  className="flex w-full items-center gap-3 rounded-xl border border-border-secondary bg-background-secondary/30 p-2.5 text-left transition-colors hover:border-border-brand"
                  onClick={() => handleAddMedia(item.id)}
                  type="button"
                >
                  <div className="flex h-8 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background-secondary">
                    {item.thumbnail_url ? (
                      <img alt={item.title} className="h-full w-full object-cover" src={item.thumbnail_url} />
                    ) : (
                      <Icon className="h-4 w-4 text-text-quaternary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-text-primary">{item.title}</p>
                    <p className="text-xs text-text-quaternary capitalize">{item.type}</p>
                  </div>
                  <Plus className="h-4 w-4 shrink-0 text-text-quaternary" />
                </button>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}

// ── Broadcast List ───────────────────────────────────────────

export function BroadcastsPage() {
  const { search, setSearch, activeFilters, filtered, handleFilterChange, clearFilters } = useListFilter({
    data: mockBroadcasts,
    searchFields: SEARCH_FIELDS,
  })
  const [selectedBroadcast, setSelectedBroadcast] = useState<Broadcast | null>(null)

  if (selectedBroadcast) {
    return <BroadcastDetail broadcast={selectedBroadcast} onBack={() => setSelectedBroadcast(null)} />
  }

  function getScheduleCopy(row: Broadcast) {
    const date = row.scheduled_at ?? row.started_at
    return date ? formatDateTime(date) : 'Not scheduled'
  }

  function renderRow(row: Broadcast) {
    return (
      <>
        <DataTable.Cell className="font-medium text-text-primary">{row.title}</DataTable.Cell>
        <DataTable.Cell>{row.channel}</DataTable.Cell>
        <DataTable.Cell>
          <StatusBadge status={row.status} variant={row.status === 'live' ? 'dot' : 'default'} />
        </DataTable.Cell>
        <DataTable.Cell className="text-text-quaternary">{getScheduleCopy(row)}</DataTable.Cell>
        <DataTable.Cell>{row.duration_minutes ? `${row.duration_minutes}m` : '—'}</DataTable.Cell>
        <DataTable.Cell>{row.viewer_count?.toLocaleString() ?? '—'}</DataTable.Cell>
      </>
    )
  }

  function renderCard(row: Broadcast) {
    return (
      <RecordCard.Root onClick={() => setSelectedBroadcast(row)}>
        <RecordCard.Header>
          <RecordCard.Heading>
            <RecordCard.Title>{row.title}</RecordCard.Title>
            <RecordCard.Subtitle>{row.channel}</RecordCard.Subtitle>
          </RecordCard.Heading>
          <StatusBadge status={row.status} variant={row.status === 'live' ? 'dot' : 'default'} />
        </RecordCard.Header>
        <RecordCard.FieldGrid>
          <RecordCard.Field label="Scheduled">{getScheduleCopy(row)}</RecordCard.Field>
          <RecordCard.Field label="Duration">{row.duration_minutes ? `${row.duration_minutes} minutes` : 'TBD'}</RecordCard.Field>
        </RecordCard.FieldGrid>
      </RecordCard.Root>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-xs">
          <SearchInput value={search} onChange={setSearch} placeholder="Search broadcasts..." />
        </div>
        <FilterDrawer filters={FILTERS} activeFilters={activeFilters} onFilterChange={handleFilterChange} onClearAll={clearFilters} />
      </div>

      <FilterSummary filters={FILTERS} activeFilters={activeFilters} onClearAll={clearFilters} onRemove={handleFilterChange} />

      <DataTable.Root
        data={filtered}
        emptyMessage="No broadcasts match the current filters."
        getRowKey={(row) => row.id}
        onRowClick={setSelectedBroadcast}
        renderCard={renderCard}
      >
        <DataTable.Header>
          <DataTable.Column field="title" sortable>Title</DataTable.Column>
          <DataTable.Column field="channel" sortable>Channel</DataTable.Column>
          <DataTable.Column field="status" sortable>Status</DataTable.Column>
          <DataTable.Column field="scheduled_at" sortable>Scheduled</DataTable.Column>
          <DataTable.Column field="duration_minutes" sortable>Duration</DataTable.Column>
          <DataTable.Column field="viewer_count" sortable>Viewers</DataTable.Column>
        </DataTable.Header>
        <DataTable.Body<Broadcast> render={renderRow} />
      </DataTable.Root>
    </div>
  )
}
