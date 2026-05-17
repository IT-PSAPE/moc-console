import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Title, Paragraph, Label } from '@moc/ui/components/display/text'
import { Button } from '@moc/ui/components/controls/button'
import { Spinner } from '@moc/ui/components/feedback/spinner'
import { ScrollArea } from '@moc/ui/components/display/scroll-area'
import { EmptyState } from '@moc/ui/components/feedback/empty-state'
import { Play, TvMinimalPlay, ChevronLeft } from 'lucide-react'
import { getErrorMessage } from '@moc/utils/get-error-message'
import {
  fetchPublishedPlaylists,
  fetchWorkspace,
  type PlayablePlaylist,
  type BroadcastWorkspace,
} from '@/data/fetch-broadcast'
import { routes, playerPath } from '@/screens/broadcast-routes'
import { CoverArt } from '@/features/components/cover-art'
import { PlaylistCard } from '@/features/components/playlist-card'
import { estimatePlaylistRuntime, formatRuntime, cueCountLabel } from '@/lib/utils'

function metaLine(playable: PlayablePlaylist): string {
  const count = cueCountLabel(playable.playlist.cues.length)
  const runtime = formatRuntime(estimatePlaylistRuntime(playable.playlist))
  return runtime ? `${count} · ${runtime}` : count
}

export function HomeScreen() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const navigate = useNavigate()
  const [workspace, setWorkspace] = useState<BroadcastWorkspace | undefined>()
  const [playlists, setPlaylists] = useState<PlayablePlaylist[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!workspaceId) return
    let cancelled = false
    Promise.all([fetchWorkspace(workspaceId), fetchPublishedPlaylists(workspaceId)])
      .then(([ws, pls]) => {
        if (cancelled) return
        setWorkspace(ws)
        setPlaylists(pls)
        setSelectedId(pls[0]?.playlist.id ?? null)
      })
      .catch((e) => { if (!cancelled) setError(getErrorMessage(e, 'Could not load playlists.')) })
    return () => { cancelled = true }
  }, [workspaceId])

  if (error) {
    return (
      <div data-theme="dark" className="min-h-dvh bg-primary flex items-center justify-center">
        <EmptyState icon={<TvMinimalPlay />} title="Couldn't load playlists" description={error} />
      </div>
    )
  }

  if (playlists === null) {
    return (
      <div data-theme="dark" className="min-h-dvh bg-primary flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  const selected = playlists.find((p) => p.playlist.id === selectedId) ?? playlists[0]

  function goToChooser() {
    navigate(routes.chooser)
  }

  function playSelected() {
    navigate(playerPath(workspaceId!, selected.playlist.id))
  }

  function selectPlaylist(id: string) {
    setSelectedId(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openPlaylist(id: string) {
    navigate(playerPath(workspaceId!, id))
  }

  return (
    <div data-theme="dark" className="min-h-dvh bg-primary text-primary flex flex-col">
      {/* Top bar */}
      <header className="absolute top-0 inset-x-0 z-20 flex items-center gap-3 px-6 py-4">
        <Button
          variant="ghost"
          onClick={goToChooser}
          aria-label="Back to spaces"
          className="!gap-1 !px-2 !py-1 text-tertiary hover:!bg-white/10 hover:text-primary"
        >
          <ChevronLeft className="size-5" />
          <TvMinimalPlay className="size-5 text-brand_secondary" />
        </Button>
        <Label.md className="text-tertiary">{workspace?.name ?? 'MOC Broadcast'}</Label.md>
      </header>

      {playlists.length === 0 || !selected ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState icon={<TvMinimalPlay />} title="No playlists yet" description="Nothing has been published to broadcast." />
        </div>
      ) : (
        <div className="flex flex-col justify-end relative h-screen">
          <CoverArt
            key={selected.playlist.id}
            playable={selected}
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black via-black/55 to-black/10" />
          <div className="absolute inset-0 bg-linear-to-r from-black/85 via-black/35 to-transparent" />

          {/* Cinematic hero — full-bleed cover of the selected playlist */}
          <section className="relative min-h-110 w-full overflow-hidden">

            <div className="relative z-10 flex h-full flex-col justify-end gap-4 px-6 pb-12 max-w-content mx-auto w-full">
              <Title.h1 className="max-w-2xl text-white drop-shadow-lg">{selected.playlist.name}</Title.h1>
              {selected.playlist.description && (
                <Paragraph.lg className="max-w-xl text-white/75 line-clamp-3">{selected.playlist.description}</Paragraph.lg>
              )}
              <Label.md className="text-white/60">{metaLine(selected)}</Label.md>
              <div className="pt-2">
                <Button icon={<Play />} onClick={playSelected}>
                  Play
                </Button>
              </div>
            </div>
          </section>

          {/* Well — every playlist; clicking one drives the hero above */}
          <ScrollArea className="max-w-content mx-auto w-full">
            <ScrollArea.Viewport className="px-6 py-8">
              <ScrollArea.Content className="flex gap-4 p-1">
                {playlists.map((p) => (
                  <PlaylistCard
                    key={p.playlist.id}
                    playable={p}
                    meta={metaLine(p)}
                    isSelected={p.playlist.id === selected.playlist.id}
                    onSelect={selectPlaylist}
                    onOpen={openPlaylist}
                  />
                ))}
              </ScrollArea.Content>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar orientation="horizontal" className="mx-6">
              <ScrollArea.Thumb />
            </ScrollArea.Scrollbar>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
