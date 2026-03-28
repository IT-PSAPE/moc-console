import { useState } from 'react'
import { Film, Image, Layers, Music, Upload, Plus, Eye, Trash2, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/components/ui/search-input'
import { FilterDrawer } from '@/components/ui/filter-drawer'
import { FilterSummary } from '@/components/ui/filter-summary'
import { StatusBadge } from '@/components/ui/status-badge'
import { DetailPanel } from '@/components/ui/detail-panel'
import { useListFilter } from '@/hooks/use-list-filter'
import { useMediaLibrary } from '@/hooks/use-media-queue'
import { formatDateTime } from '@/lib/utils'
import { MEDIA_ICONS, MEDIA_FILTERS } from './broadcast-workspace-context'
import type { MediaItem } from '@/types'

const SEARCH_FIELDS: (keyof MediaItem)[] = ['title', 'type']

function MediaCard({ item, onSelect }: { item: MediaItem; onSelect: (item: MediaItem) => void }) {
  const Icon = MEDIA_ICONS[item.type]

  return (
    <button
      className="group flex w-full flex-col overflow-hidden rounded-xl border border-border-secondary bg-background-primary text-left transition-colors hover:border-border-brand"
      onClick={() => onSelect(item)}
      type="button"
    >
      <div className="relative flex h-32 w-full items-center justify-center bg-background-secondary">
        {item.thumbnail_url ? (
          <img alt={item.title} className="h-full w-full object-cover" src={item.thumbnail_url} />
        ) : (
          <Icon className="h-8 w-8 text-text-quaternary" />
        )}
        <div className="absolute right-2 top-2">
          <StatusBadge status={item.type} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="truncate text-sm font-medium text-text-primary">{item.title}</p>
        <p className="text-xs text-text-quaternary">{formatDateTime(item.created_at)}</p>
      </div>
    </button>
  )
}

function PresentationBuilder() {
  const [slides, setSlides] = useState<{ id: string; title: string; duration: number }[]>([
    { id: '1', title: 'Slide 1 — Welcome', duration: 8 },
    { id: '2', title: 'Slide 2 — Scripture', duration: 10 },
    { id: '3', title: 'Slide 3 — Points', duration: 8 },
  ])

  function handleRemoveSlide(id: string) {
    setSlides((prev) => prev.filter((s) => s.id !== id))
  }

  function handleAddSlide() {
    const newId = String(Date.now())
    setSlides((prev) => [...prev, { id: newId, title: `Slide ${prev.length + 1}`, duration: 8 }])
  }

  function handleDurationChange(id: string, duration: number) {
    setSlides((prev) => prev.map((s) => (s.id === id ? { ...s, duration } : s)))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Presentation Builder</h3>
          <p className="mt-1 text-xs text-text-tertiary">
            Compose a sequence of slides from your media. The result is saved as a single reusable item.
          </p>
        </div>
        <Button size="sm" variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={handleAddSlide}>
          Add Slide
        </Button>
      </div>

      {slides.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-secondary px-4 py-10 text-center text-sm text-text-tertiary">
          No slides yet. Add images, videos, or audio-backed slides to build a presentation.
        </div>
      ) : (
        <div className="space-y-2">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className="flex items-center gap-3 rounded-xl border border-border-secondary bg-background-secondary/50 p-3"
            >
              <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-text-quaternary" />
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-background-primary text-xs font-medium text-text-secondary">
                {index + 1}
              </span>
              <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-background-primary">
                <Image className="h-4 w-4 text-text-quaternary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">{slide.title}</p>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-text-tertiary">
                  <input
                    className="h-7 w-14 rounded-lg border border-border-secondary bg-background-primary px-2 text-center text-xs text-text-primary"
                    min={1}
                    onChange={(e) => handleDurationChange(slide.id, Number(e.target.value))}
                    type="number"
                    value={slide.duration}
                  />
                  sec
                </label>
                <button
                  aria-label="Remove slide"
                  className="rounded-lg p-2 text-text-quaternary transition-colors hover:bg-background-secondary hover:text-utility-error-600"
                  onClick={() => handleRemoveSlide(slide.id)}
                  type="button"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button size="sm" disabled={slides.length === 0}>
          Save Presentation
        </Button>
        <Button size="sm" variant="secondary" icon={<Eye className="h-4 w-4" />} disabled={slides.length === 0}>
          Preview
        </Button>
      </div>
    </div>
  )
}

export function MediaBinPage() {
  const { data: mediaItems = [] } = useMediaLibrary()
  const { search, setSearch, activeFilters, filtered, handleFilterChange, clearFilters } = useListFilter({
    data: mediaItems,
    searchFields: SEARCH_FIELDS,
  })
  const [selected, setSelected] = useState<MediaItem | null>(null)
  const [showBuilder, setShowBuilder] = useState(false)

  const counts = {
    video: mediaItems.filter((m) => m.type === 'video').length,
    image: mediaItems.filter((m) => m.type === 'image').length,
    audio: mediaItems.filter((m) => m.type === 'audio').length,
    slides: mediaItems.filter((m) => m.type === 'slides').length,
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([
          { type: 'video', icon: Film, label: 'Videos', accent: 'bg-utility-blue-50 text-utility-blue-600' },
          { type: 'image', icon: Image, label: 'Images', accent: 'bg-purple-50 text-purple-600' },
          { type: 'audio', icon: Music, label: 'Audio', accent: 'bg-utility-warning-50 text-utility-warning-600' },
          { type: 'slides', icon: Layers, label: 'Presentations', accent: 'bg-utility-success-50 text-utility-success-600' },
        ] as const).map(({ type, icon: Icon, label, accent }) => (
          <div key={type} className="flex items-center gap-3 rounded-xl border border-border-secondary bg-background-primary p-4">
            <div className={`rounded-lg p-2 ${accent}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-lg font-semibold text-text-primary">{counts[type]}</p>
              <p className="text-xs text-text-tertiary">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="w-full sm:max-w-xs">
            <SearchInput value={search} onChange={setSearch} placeholder="Search media..." />
          </div>
          <FilterDrawer
            filters={MEDIA_FILTERS}
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
            onClearAll={clearFilters}
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" icon={<Layers className="h-4 w-4" />} onClick={() => setShowBuilder(!showBuilder)}>
            {showBuilder ? 'Hide Builder' : 'New Presentation'}
          </Button>
          <Button size="sm" icon={<Upload className="h-4 w-4" />}>
            Upload Media
          </Button>
        </div>
      </div>

      <FilterSummary filters={MEDIA_FILTERS} activeFilters={activeFilters} onClearAll={clearFilters} onRemove={handleFilterChange} />

      {showBuilder && (
        <section className="rounded-2xl border border-border-secondary bg-background-primary p-5">
          <PresentationBuilder />
        </section>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-secondary px-4 py-16 text-center">
          <Film className="mx-auto h-8 w-8 text-text-quaternary" />
          <p className="mt-2 text-sm text-text-tertiary">No media matches the current filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((item) => (
            <MediaCard key={item.id} item={item} onSelect={setSelected} />
          ))}
        </div>
      )}

      <DetailPanel.Root open={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <>
            <DetailPanel.Header>{selected.title}</DetailPanel.Header>
            <DetailPanel.Body>
              <DetailPanel.Section label="Preview">
                <div className="flex h-40 w-full items-center justify-center overflow-hidden rounded-xl bg-background-secondary">
                  {selected.thumbnail_url ? (
                    <img alt={selected.title} className="h-full w-full object-cover" src={selected.thumbnail_url} />
                  ) : (
                    <Film className="h-8 w-8 text-text-quaternary" />
                  )}
                </div>
              </DetailPanel.Section>
              <DetailPanel.Section label="Details">
                <DetailPanel.Field label="Type">
                  <StatusBadge status={selected.type} />
                </DetailPanel.Field>
                <DetailPanel.Field label="Created">{formatDateTime(selected.created_at)}</DetailPanel.Field>
                {selected.metadata?.dimensions && (
                  <DetailPanel.Field label="Dimensions">{selected.metadata.dimensions}</DetailPanel.Field>
                )}
                {selected.metadata?.duration_seconds != null && (
                  <DetailPanel.Field label="Duration">{selected.metadata.duration_seconds}s</DetailPanel.Field>
                )}
                {selected.metadata?.default_duration != null && (
                  <DetailPanel.Field label="Default Display">{selected.metadata.default_duration}s</DetailPanel.Field>
                )}
                {selected.metadata?.slides && (
                  <DetailPanel.Field label="Slides">{selected.metadata.slides.length} slide(s)</DetailPanel.Field>
                )}
              </DetailPanel.Section>
            </DetailPanel.Body>
          </>
        )}
      </DetailPanel.Root>
    </div>
  )
}
