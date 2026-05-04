import { useCallback, useEffect } from "react"
import { randomId } from "@/utils/random-id"
import { useFeedback } from "@/components/feedback/feedback-provider"
import { useNavigate } from "react-router-dom"
import { Card } from "@/components/display/card"
import { Header } from "@/components/display/header"
import { Button } from "@/components/controls/button"
import { Input } from "@/components/form/input"
import { Label, Paragraph, Title } from "@/components/display/text"
import { Spinner } from "@/components/feedback/spinner"
import { useBroadcast } from "@/features/broadcast/broadcast-provider"
import { usePlaylistFilters } from "@/features/broadcast/use-broadcast-filters"
import { PlaylistListItem } from "@/features/broadcast/broadcast-list-item"
import type { Playlist } from "@/types/broadcast"
import { updatePlaylist } from "@/data/mutate-broadcast"
import { getErrorMessage } from "@/utils/get-error-message"
import { Plus, Search } from "lucide-react"
import { routes } from "@/screens/console-routes"

export function PlaylistScreen() {
  const navigate = useNavigate()
  const {
    state: { playlists, isLoadingPlaylists },
    actions: { loadPlaylists, syncPlaylist },
  } = useBroadcast()
  const { toast } = useFeedback()

  useEffect(() => {
    loadPlaylists()
  }, [loadPlaylists])

  const playlistFilters = usePlaylistFilters(playlists)
  const { filtered, setSearch, filters: state } = playlistFilters

  const handleCreatePlaylist = useCallback(async () => {
    const newPlaylist: Playlist = {
      id: randomId(),
      name: "New Playlist",
      description: "",
      status: "draft",
      createdAt: new Date().toISOString(),
      cues: [],
      backgroundMusicId: null,
      backgroundMusicUrl: null,
      backgroundMusicName: null,
      defaultImageDuration: 10,
      videoSettings: { autoplay: true, loop: false, muted: false },
    }
    try {
      const savedPlaylist = await updatePlaylist(newPlaylist)
      syncPlaylist(savedPlaylist)
      navigate(`/${routes.broadcastPlaylistDetail.replace(":id", newPlaylist.id)}`, {
        state: { isNew: true },
      })
    } catch (error) {
      toast({ title: "Failed to create playlist", description: getErrorMessage(error, "The playlist could not be created."), variant: "error" })
    }
  }, [syncPlaylist, navigate, toast])

  return (
    <section>
      <Header className="p-4 pt-8 mx-auto max-w-content">
        <Header.Lead className="gap-2">
          <Title.h6>Playlists</Title.h6>
          <Paragraph.sm className="text-tertiary max-w-2xl">
            Manage your broadcast playlists. Click a playlist to view and edit its details.
          </Paragraph.sm>
        </Header.Lead>
      </Header>

      <div className="flex flex-col gap-4 p-4 pt-0 mx-auto w-full max-w-content">
        <Header className="gap-2 max-mobile:flex-col *:max-mobile:w-full">
          <Header.Lead className="gap-2">
            <Label.md>Playlists</Label.md>
          </Header.Lead>
          <Header.Trail className="gap-2 flex-1 justify-end">
            <Input
              icon={<Search />}
              placeholder="Search playlists..."
              className="w-full max-w-md"
              value={state.search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button.Icon variant="secondary" icon={<Plus />} onClick={handleCreatePlaylist} />
          </Header.Trail>
        </Header>

        <Card>
          <Card.Content ghost className="flex flex-col gap-1">
            {isLoadingPlaylists ? (
              <div className="flex justify-center py-12"><Spinner /></div>
            ) : filtered.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Paragraph.sm className="text-tertiary">No playlists found.</Paragraph.sm>
              </div>
            ) : (
              filtered.map((playlist) => (
                <PlaylistListItem key={playlist.id} playlist={playlist} />
              ))
            )}
          </Card.Content>
        </Card>
      </div>
    </section>
  )
}
