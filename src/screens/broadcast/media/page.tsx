import { useEffect, useState } from "react"
import { Card } from "@/components/display/card"
import { Header } from "@/components/display/header"
import { Input } from "@/components/form/input"
import { Button } from "@/components/controls/button"
import { Decision } from "@/components/display/decision"
import { Spinner } from "@/components/feedback/spinner"
import { EmptyState } from "@/components/feedback/empty-state"
import { Label, Paragraph, Title } from "@/components/display/text"
import { useBroadcast } from "@/features/broadcast/broadcast-provider"
import { useMediaFilters } from "@/features/broadcast/use-media-filters"
import { MediaListItem } from "@/features/broadcast/media-list-item"
import { MediaPreview } from "@/features/broadcast/media-preview"
import { UploadMediaModal } from "@/features/broadcast/upload-media-modal"
import type { MediaItem } from "@/types/broadcast"
import type { MediaType } from "@/types/broadcast"
import { Film, Plus, Search } from "lucide-react"
import { SegmentedControl } from "@/components/controls/segmented-control"


export function BroadcastMediaScreen() {
  const {
    state: { media, isLoadingMedia },
    actions: { loadMedia, syncMediaItem },
  } = useBroadcast()

  useEffect(() => {
    loadMedia()
  }, [loadMedia])

  const mediaFilters = useMediaFilters(media)
  const { filtered, setSearch, setType, filters: state } = mediaFilters

  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)

  function handleTabChange(tab: string) {
    setType(tab === "all" ? null : (tab as MediaType))
  }

  function handleUploadSubmit(item: MediaItem) {
    syncMediaItem(item)
  }

  return (
    <section className="h-full flex flex-col">
      <Header.Root className="p-4 pt-8 mx-auto max-w-content shrink-0">
        <Header.Lead className="gap-2">
          <Title.h6>Media</Title.h6>
          <Paragraph.sm className="text-tertiary max-w-2xl">
            Browse and preview your media library. Select an item to preview it.
          </Paragraph.sm>
        </Header.Lead>
      </Header.Root>

      <Decision.Root value={media} loading={isLoadingMedia}>
        <Decision.Loading>
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        </Decision.Loading>
        <Decision.Empty>
          <div className="flex flex-col items-center gap-4 py-16">
            <EmptyState icon={<Film />} title="No media yet" description="Add media items to build your library." />
            <Button variant="primary" icon={<Plus />} onClick={() => setUploadOpen(true)}>
              Add Media
            </Button>
          </div>
        </Decision.Empty>
        <Decision.Data>
          <div className="flex-1 min-h-0 flex gap-2 p-4 pt-0 mx-auto w-full max-w-content">
            {/* Left panel — media list in a Card */}
            <Card.Root className="w-100 shrink-0 flex flex-col max-mobile:w-full overflow-hidden">
              <Card.Header className="gap-2 justify-between">
                <Label.sm>Library</Label.sm>
                <div className="flex gap-1 items-center">
                  <Input
                    icon={<Search />}
                    placeholder="Search media..."
                    value={state.search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="shrink-0"
                  />
                  <Button.Icon variant="secondary" icon={<Plus />} onClick={() => setUploadOpen(true)} />
                </div>
              </Card.Header>
              <Card.Content className="flex flex-col flex-1 min-h-0 overflow-hidden py-2">

                <SegmentedControl.Root defaultValue="all" onValueChange={(value) => handleTabChange(value)} className="mx-2">
                  <SegmentedControl.Item value="all">All</SegmentedControl.Item>
                  <SegmentedControl.Item value="image">Images</SegmentedControl.Item>
                  <SegmentedControl.Item value="audio">Audio</SegmentedControl.Item>
                  <SegmentedControl.Item value="video">Video</SegmentedControl.Item>
                  <SegmentedControl.Item value="slide">Slides</SegmentedControl.Item>
                </SegmentedControl.Root>

                {/* Media list */}
                <div className="flex-1 py-2 overflow-y-auto">
                  {(filtered.map((item) => (
                    <MediaListItem
                      key={item.id}
                      item={item}
                      onClick={() => setSelectedItem(item)}
                    />
                  )))}
                </div>
              </Card.Content>
            </Card.Root>

            {/* Right panel — preview */}
            <Card.Root className="flex-1 min-w-0 flex flex-col max-mobile:hidden overflow-hidden">
              <Card.Content className="flex-1 flex flex-col min-h-0">
                <MediaPreview item={selectedItem} />
              </Card.Content>
            </Card.Root>
          </div>
        </Decision.Data>
      </Decision.Root>

      <UploadMediaModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onSubmit={handleUploadSubmit}
      />
    </section>
  )
}
