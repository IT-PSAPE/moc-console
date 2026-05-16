import { Music } from 'lucide-react'
import type { PlayablePlaylist } from '@/data/fetch-broadcast'

// A playlist has no dedicated artwork beyond the optional thumbnailUrl,
// so fall back to the first cue's media thumbnail, then to a branded
// gradient placeholder.
export function coverFor(playable: PlayablePlaylist): string | null {
  if (playable.playlist.thumbnailUrl) return playable.playlist.thumbnailUrl
  for (const cue of playable.playlist.cues) {
    const media = playable.mediaById[cue.mediaItemId]
    if (media?.thumbnail) return media.thumbnail
    if (media?.url && cue.mediaItemType === 'image') return media.url
  }
  return null
}

export function CoverArt({ playable, className }: { playable: PlayablePlaylist; className?: string }) {
  const src = coverFor(playable)
  if (src) {
    return <img src={src} alt="" className={className} loading="lazy" />
  }
  return (
    <div className={`${className} bg-linear-to-br from-utility-brand-700 to-utility-brand-500 flex items-center justify-center`}>
      <Music className="size-1/4 text-white/40" />
    </div>
  )
}
