import { Card } from "@/components/display/card"
import { Header } from "@/components/display/header"
import { Badge } from "@/components/display/badge"
import { Label, Paragraph, TextBlock, Title } from "@/components/display/text"
import { Decision } from "@/components/display/decision"
import { Spinner } from "@/components/feedback/spinner"
import { EmptyState } from "@/components/feedback/empty-state"
import { DataTable } from "@/components/display/data-table"
import { useBroadcast } from "@/features/broadcast/broadcast-provider"
import { playlistStatusColor, playlistStatusLabel } from "@/types/broadcast"
import type { Playlist } from "@/types/broadcast"
import { Radio, ListMusic, CircleCheck, FileEdit, Film } from "lucide-react"
import { useEffect, useMemo } from "react"

type PlaylistReadiness = Record<string, unknown> & {
  id: string
  name: string
  status: Playlist["status"]
  cues: number
  readiness: string
}

const readinessColumns = [
  { key: "name", header: "Playlist" },
  {
    key: "status",
    header: "Status",
    render: (_: unknown, row: PlaylistReadiness) => (
      <Badge label={playlistStatusLabel[row.status]} color={playlistStatusColor[row.status]} />
    ),
  },
  {
    key: "cues",
    header: "Cues",
  },
  {
    key: "readiness",
    header: "Readiness",
  },
]

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
  const hasData = playlists.length > 0 || media.length > 0

  // Stats
  const totalPlaylists = playlists.length
  const publishedCount = playlists.filter((p) => p.status === "published").length
  const draftCount = playlists.filter((p) => p.status === "draft").length

  const playlistReadiness = useMemo<PlaylistReadiness[]>(() => {
    const mediaIds = new Set(media.map((item) => item.id))
    return playlists.map((playlist) => {
      const missingMediaCount = playlist.cues.filter((cue) => !mediaIds.has(cue.mediaItemId)).length
      const issues = [
        playlist.cues.length === 0 ? "No cues" : null,
        missingMediaCount > 0 ? `${missingMediaCount} missing media` : null,
        playlist.status === "draft" ? "Draft" : null,
      ].filter(Boolean)
      return {
        id: playlist.id,
        name: playlist.name,
        status: playlist.status,
        cues: playlist.cues.length,
        readiness: issues.length > 0 ? issues.join(" · ") : "Ready",
      }
    })
  }, [media, playlists])

  return (
    <section>
      <Header.Root className="p-4 pt-8 mx-auto max-w-content">
        <Header.Lead className="gap-2">
          <Title.h6>Broadcast</Title.h6>
          <Paragraph.sm className="text-tertiary max-w-2xl">
            Overview of your broadcast playlists and media library.
          </Paragraph.sm>
        </Header.Lead>
      </Header.Root>

      <Decision.Root value={hasData || null} loading={isLoading}>
        <Decision.Loading>
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        </Decision.Loading>
        <Decision.Empty>
          <EmptyState icon={<Radio />} title="No playlists yet" description="Create a playlist and add media to get started." />
        </Decision.Empty>
        <Decision.Data>
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 p-4 pt-8 mx-auto w-full max-w-content max-mobile:grid-cols-2 max-mobile:gap-2">
            <Card.Root>
              <Card.Header className="gap-1.5">
                <ListMusic className="size-4" />
                <Label.sm>Total Playlists</Label.sm>
              </Card.Header>
              <Card.Content className="p-4">
                <TextBlock className="title-h4">{totalPlaylists}</TextBlock>
              </Card.Content>
            </Card.Root>
            <Card.Root>
              <Card.Header className="gap-1.5">
                <CircleCheck className="size-4" />
                <Label.sm>Published</Label.sm>
              </Card.Header>
              <Card.Content className="p-4">
                <TextBlock className="title-h4">{publishedCount}</TextBlock>
              </Card.Content>
            </Card.Root>
            <Card.Root>
              <Card.Header className="gap-1.5">
                <FileEdit className="size-4" />
                <Label.sm>Draft</Label.sm>
              </Card.Header>
              <Card.Content className="p-4">
                <TextBlock className="title-h4">{draftCount}</TextBlock>
              </Card.Content>
            </Card.Root>
            <Card.Root>
              <Card.Header className="gap-1.5">
                <Film className="size-4" />
                <Label.sm>Media Items</Label.sm>
              </Card.Header>
              <Card.Content className="p-4">
                <TextBlock className="title-h4">{media.length}</TextBlock>
              </Card.Content>
            </Card.Root>
          </div>

          {/* Readiness */}
          <div className="flex flex-col gap-4 p-4 pt-8 mx-auto w-full max-w-content">
            <Header.Root>
              <Header.Lead className="gap-2">
                <Label.md>Playlist Readiness</Label.md>
                <Paragraph.xs className="text-tertiary">Published playlists should be ready for people to use immediately.</Paragraph.xs>
              </Header.Lead>
            </Header.Root>
            <Card.Root>
              <Card.Content className="!border-secondary overflow-hidden">
                <DataTable data={playlistReadiness} columns={readinessColumns} emptyMessage="No playlists to review" />
              </Card.Content>
            </Card.Root>
          </div>
        </Decision.Data>
      </Decision.Root>
    </section>
  )
}
