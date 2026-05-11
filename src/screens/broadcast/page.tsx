import { Card } from "@/components/display/card"
import { Header } from "@/components/display/header"
import { Button } from "@/components/controls/button"
import { Input } from "@/components/form/input"
import { Label, Paragraph, TextBlock, Title } from "@/components/display/text"
import { Spinner } from "@/components/feedback/spinner"
import { EmptyState } from "@/components/feedback/empty-state"
import { Dropdown } from "@/components/overlays/dropdown"
import { useBroadcast } from "@/features/broadcast/broadcast-provider"
import { usePlaylistFilters } from "@/features/broadcast/use-broadcast-filters"
import { PlaylistListItem } from "@/features/broadcast/broadcast-list-item"
import type { PlaylistStatus } from "@/types/broadcast"
import { Check, CircleCheck, FileEdit, Film, ListMusic, Search, Settings2 } from "lucide-react"
import { useEffect } from "react"

export function BroadcastOverviewScreen() {
  const {
    state: { playlists, media, isLoadingPlaylists, isLoadingMedia },
    actions: { loadPlaylists, loadMedia },
  } = useBroadcast()

  useEffect(() => {
    loadPlaylists()
    loadMedia()
  }, [loadPlaylists, loadMedia])

  const isLoading = isLoadingPlaylists || isLoadingMedia

  // Stats
  const totalPlaylists = playlists.length
  const publishedCount = playlists.filter((p) => p.status === "published").length
  const draftCount = playlists.filter((p) => p.status === "draft").length

  const playlistFilters = usePlaylistFilters(playlists)
  const { filtered: filteredPlaylists, setSearch, toggleStatus, filters: filterState, hasActiveFilters } = playlistFilters

  const hasSearch = filterState.search.trim().length > 0

  const statusOptions: { value: PlaylistStatus; label: string }[] = [
    { value: "published", label: "Published" },
    { value: "draft", label: "Draft" },
  ]

  return (
    <section>
      <Header className="p-4 pt-8 mx-auto max-w-content">
        <Header.Lead className="gap-2">
          <Title.h6>Broadcast</Title.h6>
          <Paragraph.sm className="text-tertiary max-w-2xl">
            Overview of your broadcast playlists and media library.
          </Paragraph.sm>
        </Header.Lead>
      </Header>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 p-4 pt-8 mx-auto w-full max-w-content max-mobile:grid-cols-2 max-mobile:gap-2">
        <Card>
          <Card.Header tight className="gap-1.5">
            <ListMusic className="size-4" />
            <Label.sm>Total Playlists</Label.sm>
          </Card.Header>
          <Card.Content className="p-4">
            <TextBlock className="title-h4">{totalPlaylists}</TextBlock>
          </Card.Content>
        </Card>
        <Card>
          <Card.Header tight className="gap-1.5">
            <CircleCheck className="size-4" />
            <Label.sm>Published</Label.sm>
          </Card.Header>
          <Card.Content className="p-4">
            <TextBlock className="title-h4">{publishedCount}</TextBlock>
          </Card.Content>
        </Card>
        <Card>
          <Card.Header tight className="gap-1.5">
            <FileEdit className="size-4" />
            <Label.sm>Draft</Label.sm>
          </Card.Header>
          <Card.Content className="p-4">
            <TextBlock className="title-h4">{draftCount}</TextBlock>
          </Card.Content>
        </Card>
        <Card>
          <Card.Header tight className="gap-1.5">
            <Film className="size-4" />
            <Label.sm>Media Items</Label.sm>
          </Card.Header>
          <Card.Content className="p-4">
            <TextBlock className="title-h4">{media.length}</TextBlock>
          </Card.Content>
        </Card>
      </div>

      {/* Readiness */}
      <div className="flex flex-col gap-4 p-4 pt-8 mx-auto w-full max-w-content">
        <Header className="gap-2 max-mobile:flex-col *:max-mobile:w-full">
          <Header.Lead className="gap-2">
            <Label.md>Schedule</Label.md>
          </Header.Lead>
          <Header.Trail className="gap-2 flex-1 justify-end">
            <Input
              icon={<Search />}
              placeholder="Search playlists..."
              className="w-full max-w-md"
              value={filterState.search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Dropdown placement="bottom">
              <Dropdown.Trigger>
                <Button icon={<Settings2 />} variant={hasActiveFilters ? "primary" : "secondary"}>Filter</Button>
              </Dropdown.Trigger>
              <Dropdown.Panel>
                {statusOptions.map((option) => {
                  const checked = filterState.statuses.has(option.value)
                  return (
                    <Dropdown.Item key={option.value} onSelect={() => toggleStatus(option.value)}>
                      <span className="flex size-4 items-center justify-center">
                        {checked && <Check className="size-4" />}
                      </span>
                      {option.label}
                    </Dropdown.Item>
                  )
                })}
              </Dropdown.Panel>
            </Dropdown>
          </Header.Trail>
        </Header>
        <Card>
          <Card.Header tight className="gap-1.5">
            <ListMusic className="size-4" />
            <Label.sm>Playlists</Label.sm>
          </Card.Header>
          <Card.Content ghost className="flex flex-col gap-1.5">
            {isLoading ? (
              <LoadingSpinner className="py-6" />
            ) : filteredPlaylists.length > 0 ? (
              filteredPlaylists.map((playlist) => (
                <PlaylistListItem key={playlist.id} playlist={playlist} />
              ))
            ) : (
              <EmptyState
                icon={<ListMusic />}
                title={hasSearch || hasActiveFilters ? "No playlists match your filters" : "No playlists yet"}
                description={hasSearch || hasActiveFilters ? "Try a different search term or clear filters." : "Create a playlist to schedule broadcast cues."}
              />
            )}
          </Card.Content>
        </Card>
      </div>
    </section>
  )
}
