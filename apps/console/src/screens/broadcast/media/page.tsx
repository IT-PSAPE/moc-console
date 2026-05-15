import { useCallback, useEffect, useState } from "react"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"
import { Header } from "@moc/ui/components/display/header"
import { Input } from "@moc/ui/components/form/input"
import { Button } from "@moc/ui/components/controls/button"
import { Label, Paragraph, Title } from "@moc/ui/components/display/text"
import { useBroadcast } from "@/features/broadcast/broadcast-provider"
import { MediaLibraryView } from "@/features/broadcast/media-library"
import { UploadMediaModal } from "@/features/broadcast/upload-media-modal"
import type { MediaItem } from "@moc/types/broadcast"
import { createMediaItem } from "@moc/data/mutate-broadcast"
import { getErrorMessage } from "@moc/utils/get-error-message"
import { Plus, Search } from "lucide-react"

export function BroadcastMediaScreen() {
  const {
    actions: { loadMedia, syncMediaItem },
  } = useBroadcast()
  const { toast } = useFeedback()

  useEffect(() => {
    loadMedia()
  }, [loadMedia])

  const [searchQuery, setSearchQuery] = useState("")
  const [uploadOpen, setUploadOpen] = useState(false)

  const handleUploadSubmit = useCallback(async (item: MediaItem) => {
    try {
      const savedItem = await createMediaItem(item)
      syncMediaItem(savedItem)
    } catch (error) {
      toast({ title: "Failed to add media", description: getErrorMessage(error, "The media item could not be added."), variant: "error" })
      throw error
    }
  }, [syncMediaItem, toast])

  return (
    <section className="h-full flex flex-col">
      <Header className="p-4 pt-8 mx-auto max-w-content shrink-0">
        <Header.Lead className="gap-2">
          <Title.h6>Media</Title.h6>
          <Paragraph.sm className="text-tertiary max-w-2xl">
            Browse and preview your media library. Select an item to preview it.
          </Paragraph.sm>
        </Header.Lead>
      </Header>

      <div className="flex-1 min-h-0 flex flex-col gap-4 p-4 pt-0 mx-auto w-full max-w-content">
        <Header className="gap-2 max-mobile:flex-col *:max-mobile:w-full">
          <Header.Lead className="gap-2">
            <Label.md>Library</Label.md>
          </Header.Lead>
          <Header.Trail className="gap-2 flex-1 justify-end">
            <Input
              icon={<Search />}
              placeholder="Search media..."
              className="w-full max-w-md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button.Icon variant="secondary" icon={<Plus />} onClick={() => setUploadOpen(true)} />
          </Header.Trail>
        </Header>

        <MediaLibraryView searchQuery={searchQuery} />
      </div>

      <UploadMediaModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onSubmit={handleUploadSubmit}
      />
    </section>
  )
}
