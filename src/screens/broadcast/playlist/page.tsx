import { useCallback, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Card } from "@/components/display/card"
import { Header } from "@/components/display/header"
import { Button } from "@/components/controls/button"
import { Input } from "@/components/form/input"
import { Label, Paragraph, Title } from "@/components/display/text"
import { Decision } from "@/components/display/decision"
import { Spinner } from "@/components/feedback/spinner"
import { EmptyState } from "@/components/feedback/empty-state"
import { useBroadcast } from "@/features/broadcast/broadcast-provider"
import { usePlaylistFilters } from "@/features/broadcast/use-broadcast-filters"
import { PlaylistListItem } from "@/features/broadcast/broadcast-list-item"
import type { Playlist } from "@/types/broadcast"
import { Megaphone, Plus, Search } from "lucide-react"
import { routes } from "@/screens/console-routes"

export function PlaylistScreen() {
  const navigate = useNavigate()
  const {
    state: { playlists, isLoadingPlaylists },
    actions: { loadPlaylists, syncPlaylist },
  } = useBroadcast()

  useEffect(() => {
    loadPlaylists()
  }, [loadPlaylists])

  const playlistFilters = usePlaylistFilters(playlists)
  const { filtered, setSearch, filters: state } = playlistFilters

  const handleCreatePlaylist = useCallback(() => {
    const newPlaylist: Playlist = {
      id: crypto.randomUUID(),
      name: "New Playlist",
      description: "",
      status: "draft",
      createdAt: new Date().toISOString().split("T")[0],
      cues: [],
      backgroundMusicUrl: null,
      backgroundMusicName: null,
      defaultImageDuration: 10,
      videoSettings: { autoplay: true, loop: false, muted: false },
    }
    syncPlaylist(newPlaylist)
    navigate(`/${routes.broadcastPlaylistDetail.replace(":id", newPlaylist.id)}`, {
      state: { isNew: true },
    })
  }, [syncPlaylist, navigate])

  function handleOpenPlaylist(playlist: Playlist) {
    navigate(`/${routes.broadcastPlaylistDetail.replace(":id", playlist.id)}`)
  }

  return (
    <section>
      <Header.Root className="p-4 pt-8 mx-auto max-w-content">
        <Header.Lead className="gap-2">
          <Title.h6>Playlists</Title.h6>
          <Paragraph.sm className="text-tertiary max-w-2xl">
            Manage your broadcast playlists. Click a playlist to view and edit its details.
          </Paragraph.sm>
        </Header.Lead>
      </Header.Root>

      <Decision.Root value={playlists} loading={isLoadingPlaylists}>
        <Decision.Loading>
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        </Decision.Loading>
        <Decision.Empty>
          <div className="flex flex-col items-center gap-4 py-16">
            <EmptyState icon={<Megaphone />} title="No playlists yet" description="Create your first playlist." />
            <Button variant="primary" icon={<Plus />} onClick={handleCreatePlaylist}>
              New Playlist
            </Button>
          </div>
        </Decision.Empty>
        <Decision.Data>
          <div className="flex flex-col gap-4 p-4 pt-0 mx-auto w-full max-w-content">
            <Card.Root>
              <Card.Header className="gap-2 justify-between">
                <Label.sm>Playlists</Label.sm>
                <div className="flex gap-1 items-center shrink-0">
                  <Input
                    icon={<Search />}
                    placeholder="Search playlists..."
                    value={state.search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <Button.Icon variant="secondary" icon={<Plus />} onClick={handleCreatePlaylist} />
                </div>
              </Card.Header>
              <Card.Content ghost className="flex flex-col gap-1">
                {filtered.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <Paragraph.sm className="text-tertiary">No playlists found.</Paragraph.sm>
                  </div>
                ) : (
                  filtered.map((playlist) => (
                    <PlaylistListItem
                      key={playlist.id}
                      playlist={playlist}
                      onClick={() => handleOpenPlaylist(playlist)}
                    />
                  ))
                )}
              </Card.Content>
            </Card.Root>
          </div>
        </Decision.Data>
      </Decision.Root>
    </section>
  )
}
