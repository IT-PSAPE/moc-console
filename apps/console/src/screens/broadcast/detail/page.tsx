import { useCallback, useEffect, useMemo } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Button } from "@moc/ui/components/controls/button"
import { Input } from "@moc/ui/components/form/input"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import { Spinner } from "@moc/ui/components/feedback/spinner"
import { EmptyState } from "@moc/ui/components/feedback/empty-state"
import { useBreadcrumbOverride } from "@moc/ui/components/navigation/breadcrumb"
import { TopBarActions } from "@/features/topbar"
import { useBroadcast } from "@/features/broadcast/broadcast-provider"
import { useMediaFilters } from "@/features/broadcast/use-media-filters"
import { usePlaylistEditor } from "@/features/broadcast/use-playlist-editor"
import { Dropdown } from "@moc/ui/components/overlays/dropdown"
import { Timeline } from "@moc/ui/components/timeline"
import { PlaylistTimeline } from "@/features/broadcast/playlist-timeline"
import { usePlaylistTimeline } from "@/features/broadcast/use-playlist-timeline"
import { Radio, Search, EllipsisVertical, ListMusic } from "lucide-react"
import { routes } from "@/screens/console-routes"
import { MediaSourceItem } from "./media-source-item"
import { PlaylistCommandBar } from "./playlist-command-bar"
import { PlaylistSettingsModal } from "./playlist-settings-modal"

export function PlaylistDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    state: { media, playlists: contextPlaylists },
    actions: { loadMedia, syncPlaylist },
  } = useBroadcast()

  const editor = usePlaylistEditor({ id, contextPlaylists, syncPlaylist })
  const { playlist, isLoading } = editor

  const pt = usePlaylistTimeline({
    lanes: playlist?.lanes ?? [],
    mediaItems: media,
    defaultImageDuration: playlist?.defaultImageDuration ?? 0,
    onChange: editor.persistPlaylistLanes,
  })

  useBreadcrumbOverride(id ?? "", playlist?.name)

  useEffect(() => { loadMedia() }, [loadMedia])

  const mediaFilters = useMediaFilters(media)
  const { filtered: allFilteredMedia, setSearch, filters: mediaFilterState } = mediaFilters
  const filteredMedia = useMemo(() => allFilteredMedia.filter((m) => m.type !== "audio"), [allFilteredMedia])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value), [setSearch])
  const handleBackToPlaylists = useCallback(() => navigate(`/${routes.broadcastPlaylists}`), [navigate])

  if (isLoading) {
    return (
      <section className="flex justify-center py-16 mx-auto max-w-content-sm">
        <Spinner size="lg" />
      </section>
    )
  }

  if (!playlist) {
    return (
      <section className="mx-auto max-w-content-md">
        <EmptyState icon={<Radio />} title="Playlist not found" description="The playlist you're looking for doesn't exist." />
      </section>
    )
  }

  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden bg-primary">
      <TopBarActions>
        <Dropdown placement="bottom">
          <Dropdown.Trigger>
            <Button.Icon variant="secondary" icon={<EllipsisVertical />} />
          </Dropdown.Trigger>
          <Dropdown.Panel>
            <Dropdown.Item onSelect={handleBackToPlaylists}>
              <ListMusic className="size-4" />
              Back to Playlists
            </Dropdown.Item>
          </Dropdown.Panel>
        </Dropdown>
      </TopBarActions>

      <Timeline lanes={pt.primitiveLanes} total={pt.total} transport={pt.transport} onChange={pt.handleChange} className="relative flex min-h-0 flex-1 flex-col">
        <PlaylistCommandBar
          playlist={playlist}
          inspectorOpen={editor.inspectorOpen}
          sourceOpen={editor.sourceOpen}
          onToggleSource={editor.toggleSource}
          onNameSave={editor.handleNameSave}
          onStatusChange={editor.handleStatusChange}
          onDescriptionChange={editor.handleDescriptionChange}
          onDescriptionBlur={editor.handleDescriptionBlur}
          onThumbnailUrlChange={editor.handleThumbnailUrlChange}
          onThumbnailBlur={editor.handleThumbnailBlur}
          onThumbnailUpload={editor.handleThumbnailUpload}
          onThumbnailRemove={editor.handleThumbnailRemove}
          onToggleInspector={editor.openInspector}
        />

        <div className="relative flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 flex flex-col">
            <PlaylistTimeline
              lanes={playlist.lanes}
              primitiveLanes={pt.primitiveLanes}
              thumbById={pt.thumbById}
              urlById={pt.urlById}
              programLanes={pt.programLanes}
              transport={pt.transport}
            />
          </main>

          {editor.sourceOpen && (
            <aside className="flex w-72 shrink-0 flex-col border-l border-secondary bg-secondary_alt">
              <div className="flex items-center justify-between border-b border-secondary px-3.5 py-3">
                <Label.sm className="text-secondary">Source</Label.sm>
                <Paragraph.xs className="tabular-nums text-tertiary">{filteredMedia.length}</Paragraph.xs>
              </div>
              <div className="px-3 py-2.5">
                <Input
                  icon={<Search />}
                  placeholder="Search media..."
                  value={mediaFilterState.search}
                  onChange={handleSearchChange}
                />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {filteredMedia.length === 0 ? (
                  <Paragraph.sm className="px-4 py-10 text-center text-tertiary">No media</Paragraph.sm>
                ) : (
                  filteredMedia.map((item) => (
                    <MediaSourceItem key={item.id} item={item} onAdd={editor.handleAddMediaToQueue} />
                  ))
                )}
              </div>
            </aside>
          )}
        </div>
      </Timeline>

      <PlaylistSettingsModal
        open={editor.inspectorOpen}
        playlist={playlist}
        media={media}
        contextPlaylists={contextPlaylists}
        onClose={editor.closeInspector}
        onSelectBackgroundMusic={editor.handleSelectBackgroundMusic}
        onRemoveBackgroundMusic={editor.handleRemoveBackgroundMusic}
        onDefaultImageDurationChange={editor.handleDefaultImageDurationChange}
        onDefaultImageDurationBlur={editor.handleDefaultImageDurationBlur}
        onPlaybackModeChange={editor.handlePlaybackModeChange}
        onNextPlaylistChange={editor.handleNextPlaylistChange}
        onTransitionChange={editor.handleTransitionChange}
        onTransitionDurationChange={editor.handleTransitionDurationChange}
        onTransitionDurationBlur={editor.handleTransitionDurationBlur}
      />
    </section>
  )
}
