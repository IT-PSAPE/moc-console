import { Film } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatDateTime } from '@/lib/utils'
import { BroadcastWorkspaceSelector } from './broadcast-workspace-selector'
import { MEDIA_ICONS, getMediaItemFromQueue, useBroadcastWorkspaceContext } from './broadcast-workspace-context'

export function BroadcastActiveWorkspace() {
  const { state: { activeBroadcast, queue, selectedMedia } } = useBroadcastWorkspaceContext()
  const previewMedia = selectedMedia ?? getMediaItemFromQueue(queue[0])
  const PreviewIcon = previewMedia ? MEDIA_ICONS[previewMedia.type] : Film
  const nextAirTime = activeBroadcast?.scheduled_at ?? activeBroadcast?.started_at

  return (
    <section className="rounded-2xl border border-border-secondary bg-background-primary p-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-text-primary">Active Workspace</h2>
        <p className="text-sm text-text-tertiary">Review the selected broadcast and the asset currently in focus.</p>
      </div>

      <div className="mt-4">
        <BroadcastWorkspaceSelector label="Queue Assigned To" />
      </div>

      <div className="mt-4 rounded-xl border border-border-secondary bg-background-secondary p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-text-primary">{activeBroadcast?.title ?? 'No broadcast selected'}</p>
            <p className="mt-1 text-sm text-text-tertiary">{activeBroadcast?.description ?? 'Select a broadcast to manage its queue.'}</p>
          </div>
          {activeBroadcast && <StatusBadge status={activeBroadcast.status} variant={activeBroadcast.status === 'live' ? 'dot' : 'default'} />}
        </div>
        {activeBroadcast && (
          <div className="mt-4 grid gap-3 text-sm text-text-secondary sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-text-quaternary">Channel</p>
              <p className="mt-1">{activeBroadcast.channel}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-text-quaternary">Next Air Time</p>
              <p className="mt-1">{nextAirTime ? formatDateTime(nextAirTime) : 'Not scheduled'}</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-border-secondary bg-background-secondary/60 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-background-primary">
            <PreviewIcon className="h-5 w-5 text-text-quaternary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary">{previewMedia?.title ?? 'Nothing selected yet'}</p>
            <p className="mt-1 text-sm text-text-tertiary">
              {previewMedia ? `Focused ${previewMedia.type} item ready for queue review.` : 'Select a media item from the bin or the queue to inspect it here.'}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
