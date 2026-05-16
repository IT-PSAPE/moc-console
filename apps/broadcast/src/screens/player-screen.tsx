import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Spinner } from '@moc/ui/components/feedback/spinner'
import { EmptyState } from '@moc/ui/components/feedback/empty-state'
import { TvMinimalPlay } from 'lucide-react'
import { Button } from '@moc/ui/components/controls/button'
import { getErrorMessage } from '@moc/utils/get-error-message'
import { fetchPlaylistForPlayback, type PlayablePlaylist } from '@/data/fetch-broadcast'
import { homePath } from '@/screens/broadcast-routes'
import { Player } from '@/features/player/player'

export function PlayerScreen() {
  const { workspaceId, playlistId } = useParams<{ workspaceId: string; playlistId: string }>()
  const navigate = useNavigate()
  const [playable, setPlayable] = useState<PlayablePlaylist | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!playlistId) return
    let cancelled = false
    fetchPlaylistForPlayback(playlistId)
      .then((p) => { if (!cancelled) setPlayable(p ?? null) })
      .catch((e) => { if (!cancelled) setError(getErrorMessage(e, 'Could not load this playlist.')) })
    return () => { cancelled = true }
  }, [playlistId])

  const exit = () => navigate(workspaceId ? homePath(workspaceId) : '/')

  if (error || playable === null) {
    return (
      <div data-theme="dark" className="min-h-dvh bg-primary flex items-center justify-center">
        <EmptyState
          icon={<TvMinimalPlay />}
          title={error ? "Couldn't load playlist" : 'Playlist unavailable'}
          description={error ?? 'It may have been unpublished or removed.'}
          action={<Button variant="secondary" onClick={exit}>Back</Button>}
        />
      </div>
    )
  }

  if (playable === undefined) {
    return (
      <div data-theme="dark" className="min-h-dvh bg-primary flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return <Player playable={playable} onExit={exit} />
}
