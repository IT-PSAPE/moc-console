import { Play, Pause, Square, SkipForward, Radio, Film, Layers, ListMusic } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { mockBroadcasts } from '@/lib/mock-broadcasts'
import { mockMediaItems, mockQueueItems } from '@/lib/mock-media'
import { MEDIA_ICONS } from './broadcast-workspace-context'

export function BroadcastingOverview() {
  const liveBroadcast = mockBroadcasts.find((b) => b.status === 'live') ?? null
  const totalMedia = mockMediaItems.length
  const totalBroadcasts = mockBroadcasts.length

  const activeQueue = liveBroadcast
    ? mockQueueItems.filter((q) => q.broadcast_id === liveBroadcast.id).sort((a, b) => a.display_order - b.display_order)
    : []

  const nowPlaying = activeQueue.find((q) => q.status === 'playing') ?? null
  const upNext = activeQueue.filter((q) => q.status === 'queued').slice(0, 3)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Broadcast"
          value={liveBroadcast ? 1 : 0}
          icon={Radio}
          accent={liveBroadcast ? 'red' : 'blue'}
        />
        <StatCard label="Total Media Items" value={totalMedia} icon={Film} accent="purple" />
        <StatCard label="Total Broadcasts" value={totalBroadcasts} icon={Layers} accent="emerald" />
        <StatCard label="Items in Queue" value={activeQueue.length} icon={ListMusic} accent="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-2xl border border-border-secondary bg-background-primary p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-text-primary">Now Playing</h2>
            {liveBroadcast && (
              <StatusBadge status="live" variant="dot" />
            )}
          </div>

          {liveBroadcast && nowPlaying ? (
            <div className="mt-4">
              <div className="flex items-start gap-4 rounded-xl border border-border-secondary bg-background-secondary p-4">
                <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background-primary">
                  {nowPlaying.media_item?.thumbnail_url ? (
                    <img
                      alt={nowPlaying.media_item.title}
                      className="h-full w-full object-cover"
                      src={nowPlaying.media_item.thumbnail_url}
                    />
                  ) : (
                    <Film className="h-6 w-6 text-text-quaternary" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-text-primary">
                    {nowPlaying.media_item?.title ?? 'Unknown'}
                  </p>
                  <p className="mt-1 text-xs text-text-tertiary capitalize">
                    {nowPlaying.media_item?.type ?? 'media'} — playing in "{liveBroadcast.title}"
                  </p>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-background-primary">
                    <div className="h-full w-2/3 rounded-full bg-utility-brand-600 transition-all" />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Button size="sm" variant="secondary" icon={<Pause className="h-4 w-4" />}>
                  Pause
                </Button>
                <Button size="sm" variant="secondary" icon={<Square className="h-4 w-4" />}>
                  Stop
                </Button>
                <Button size="sm" icon={<SkipForward className="h-4 w-4" />}>
                  Next
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-border-secondary px-4 py-10 text-center">
              <Radio className="mx-auto h-8 w-8 text-text-quaternary" />
              <p className="mt-2 text-sm text-text-tertiary">No broadcast is currently live.</p>
              <Button size="sm" className="mt-3" icon={<Play className="h-4 w-4" />}>
                Start Broadcast
              </Button>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border-secondary bg-background-primary p-5">
          <h2 className="text-base font-semibold text-text-primary">Up Next</h2>
          <p className="mt-1 text-sm text-text-tertiary">
            {upNext.length > 0
              ? `Next ${upNext.length} item${upNext.length !== 1 ? 's' : ''} in the queue`
              : 'No items queued'}
          </p>

          <div className="mt-4 space-y-2">
            {upNext.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-secondary px-4 py-10 text-center text-sm text-text-tertiary">
                Queue is empty. Add media from the Media Bin.
              </div>
            ) : (
              upNext.map((item, index) => {
                const media = item.media_item
                const Icon = media ? MEDIA_ICONS[media.type] : Film
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-border-secondary bg-background-secondary/50 p-3"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-background-secondary text-xs font-medium text-text-secondary">
                      {index + 1}
                    </span>
                    <div className="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background-primary">
                      {media?.thumbnail_url ? (
                        <img alt={media.title} className="h-full w-full object-cover" src={media.thumbnail_url} />
                      ) : (
                        <Icon className="h-4 w-4 text-text-quaternary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-primary">{media?.title ?? 'Unknown'}</p>
                      <p className="text-xs text-text-quaternary capitalize">{media?.type ?? 'media'}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                )
              })
            )}
          </div>
        </section>
      </div>

      {liveBroadcast && (
        <section className="rounded-2xl border border-border-secondary bg-background-primary p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-text-primary">{liveBroadcast.title}</h2>
              <p className="mt-1 text-sm text-text-tertiary">{liveBroadcast.description}</p>
            </div>
            <StatusBadge status="live" variant="dot" />
          </div>
          <div className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-text-quaternary">Channel</p>
              <p className="mt-1 text-text-secondary">{liveBroadcast.channel}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-text-quaternary">Viewers</p>
              <p className="mt-1 text-text-secondary">{liveBroadcast.viewer_count?.toLocaleString() ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-text-quaternary">Queue Progress</p>
              <p className="mt-1 text-text-secondary">
                {activeQueue.filter((q) => q.status === 'completed').length} / {activeQueue.length} items
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
