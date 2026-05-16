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

  return (
    <div data-theme="dark" className="min-h-dvh bg-primary text-primary flex flex-col">
      {/* Top bar */}
      <header className="absolute top-0 inset-x-0 z-20 flex items-center gap-3 px-6 py-4">
        <button
          onClick={() => navigate(routes.chooser)}
          className="flex items-center gap-1 text-tertiary hover:text-primary transition-colors cursor-pointer"
        >
          <ChevronLeft className="size-5" />
          <TvMinimalPlay className="size-5 text-brand_secondary" />
        </button>
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
                <Button icon={<Play />} onClick={() => navigate(playerPath(workspaceId!, selected.playlist.id))} >
                  Play
                </Button>
              </div>
            </div>
          </section>

          {/* Well — every playlist; clicking one drives the hero above */}
          <ScrollArea className="max-w-content mx-auto w-full">
            <ScrollArea.Viewport className="px-6 py-8">
              <ScrollArea.Content className="flex gap-4 p-1">
                {playlists.map((p) => {
                  const isSelected = p.playlist.id === selected.playlist.id
                  return (
                    <button
                      key={p.playlist.id}
                      onClick={() => {
                        setSelectedId(p.playlist.id)
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                      onDoubleClick={() => navigate(playerPath(workspaceId!, p.playlist.id))}
                      aria-pressed={isSelected}
                      className="group shrink-0 w-64 max-mobile:w-48 cursor-pointer focus:outline-none text-left"
                    >
                      <div
                        className={`relative aspect-video w-full overflow-hidden rounded-xl border transition-all ${isSelected
                            ? 'border-transparent ring-3 ring-white'
                            : 'border-tertiary hover:border-secondary'
                          }`}
                      >
                        <CoverArt
                          playable={p}
                          className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105 group-focus-visible:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <span className="size-12 rounded-full bg-white/0 group-hover:bg-white/90 flex items-center justify-center transition-all scale-75 group-hover:scale-100">
                            <Play className="size-5 text-black opacity-0 group-hover:opacity-100 transition-opacity" />
                          </span>
                        </div>
                      </div>
                      <Label.md className={`mt-2.5 block truncate ${isSelected ? 'text-primary' : 'text-secondary'}`}>
                        {p.playlist.name}
                      </Label.md>
                      <Paragraph.sm className="text-tertiary truncate">{metaLine(p)}</Paragraph.sm>
                    </button>
                  )
                })}
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
