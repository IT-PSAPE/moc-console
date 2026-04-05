import { Card } from "@/components/display/card"
import { Header } from "@/components/display/header"
import { Badge } from "@/components/display/badge"
import { Label, Paragraph, TextBlock, Title } from "@/components/display/text"
import { Decision } from "@/components/display/decision"
import { Spinner } from "@/components/feedback/spinner"
import { EmptyState } from "@/components/feedback/empty-state"
import { DataTable } from "@/components/display/data-table"
import { useBroadcast } from "@/features/broadcast/broadcast-provider"
import { mediaTypeColor, mediaTypeLabel } from "@/types/broadcast"
import type { MediaItem } from "@/types/broadcast"
import { Radio, ListMusic, CircleCheck, FileEdit } from "lucide-react"
import { useEffect, useMemo } from "react"

const mediaColumns = [
  { key: "name", header: "Media" },
  {
    key: "type",
    header: "Type",
    render: (_: unknown, row: MediaItem) => (
      <Badge label={mediaTypeLabel[row.type]} color={mediaTypeColor[row.type]} />
    ),
  },
  {
    key: "createdAt",
    header: "Added",
    render: (value: unknown) => new Date(value as string).toLocaleDateString("en-ZA", { day: "numeric", month: "short" }),
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
  const activeCount = playlists.filter((p) => p.status === "active").length
  const draftCount = playlists.filter((p) => p.status === "draft").length

  // Media from the last 30 days
  const recentMedia = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    return [...media]
      .filter((m) => new Date(m.createdAt) >= cutoff)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [media])

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
          <div className="grid grid-cols-3 gap-4 p-4 pt-8 mx-auto w-full max-w-content max-mobile:grid-cols-2 max-mobile:gap-2">
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
                <Label.sm>Active</Label.sm>
              </Card.Header>
              <Card.Content className="p-4">
                <TextBlock className="title-h4">{activeCount}</TextBlock>
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
          </div>

          {/* Recent Media */}
          <div className="flex flex-col gap-4 p-4 pt-8 mx-auto w-full max-w-content">
            <Header.Root>
              <Header.Lead className="gap-2">
                <Label.md>Recent Media</Label.md>
                <Paragraph.xs className="text-tertiary">Last 30 days</Paragraph.xs>
              </Header.Lead>
            </Header.Root>
            <Card.Root>
              <Card.Content className="!border-secondary overflow-hidden">
                <DataTable data={recentMedia} columns={mediaColumns} emptyMessage="No media added in the last 30 days" />
              </Card.Content>
            </Card.Root>
          </div>
        </Decision.Data>
      </Decision.Root>
    </section>
  )
}
