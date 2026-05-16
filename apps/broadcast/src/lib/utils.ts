import type { Playlist } from '@moc/types/broadcast'

// Sum of cue runtimes. Video/audio have no stored intrinsic duration
// (it comes from the media element at play time), so an un-overridden
// non-image cue contributes 0 to the estimate.
export function estimatePlaylistRuntime(playlist: Playlist): number {
  return playlist.cues.reduce((sum, cue) => {
    if (cue.durationOverride != null) return sum + cue.durationOverride
    if (cue.mediaItemType === 'image') return sum + playlist.defaultImageDuration
    return sum
  }, 0)
}

export function formatRuntime(seconds: number): string {
  if (seconds <= 0) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${s}s`
}

export function cueCountLabel(count: number): string {
  return `${count} item${count === 1 ? '' : 's'}`
}
