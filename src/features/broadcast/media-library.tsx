import { useCallback, useEffect, useState } from "react"
import { Card } from "@/components/display/card"
import { ScrollArea } from "@/components/display/scroll-area"
import { Label, Paragraph } from "@/components/display/text"
import { Button } from "@/components/controls/button"
import { Modal } from "@/components/overlays/modal"
import { SegmentedControl } from "@/components/controls/segmented-control"
import { Decision } from "@/components/display/decision"
import { LoadingSpinner } from "@/components/feedback/spinner"
import { EmptyState } from "@/components/feedback/empty-state"
import { useFeedback } from "@/components/feedback/feedback-provider"
import { useBroadcast } from "./broadcast-provider"
import { useMediaFilters } from "./use-media-filters"
import { MediaListItem } from "./media-list-item"
import { MediaDetailDrawer } from "./media-detail-drawer"
import { deleteMediaItem } from "@/data/mutate-broadcast"
import { getErrorMessage } from "@/utils/get-error-message"
import type { MediaItem, MediaType } from "@/types/broadcast"
import { Film, TriangleAlert } from "lucide-react"

export function MediaLibraryView({ searchQuery }: { searchQuery: string }) {
  const {
    state: { media, isLoadingMedia },
    actions: { removeMediaItem },
  } = useBroadcast()
  const { toast } = useFeedback()

  const mediaFilters = useMediaFilters(media)
  const { filtered, setSearch, setType, filters: state } = mediaFilters

  useEffect(() => {
    setSearch(searchQuery)
  }, [searchQuery, setSearch])

  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null)
  const [pendingDelete, setPendingDelete] = useState<MediaItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleTabChange = (tab: string) => {
    setType(tab === "all" ? null : (tab as MediaType))
  }

  const handleDelete = useCallback(async () => {
    if (!pendingDelete) return
    setIsDeleting(true)
    try {
      await deleteMediaItem(pendingDelete)
      removeMediaItem(pendingDelete.id)
      toast({ title: "Media deleted", variant: "success" })
      setSelectedItem(null)
      setPendingDelete(null)
    } catch (error) {
      toast({ title: "Failed to delete media", description: getErrorMessage(error, "The media item could not be deleted."), variant: "error" })
    } finally {
      setIsDeleting(false)
    }
  }, [pendingDelete, removeMediaItem, toast])

  return (
    <>
      <Card className="flex-1 flex flex-col overflow-hidden">
        <Card.Header>
          <SegmentedControl defaultValue="all" onValueChange={handleTabChange} fill>
            <SegmentedControl.Item value="all">All</SegmentedControl.Item>
            <SegmentedControl.Item value="image">Images</SegmentedControl.Item>
            <SegmentedControl.Item value="audio">Audio</SegmentedControl.Item>
            <SegmentedControl.Item value="video">Video</SegmentedControl.Item>
          </SegmentedControl>
        </Card.Header>
        <Card.Content className="flex flex-col flex-1">
          <ScrollArea className="flex-1 min-h-0">
            <ScrollArea.Viewport className="py-2 pr-2">
              <ScrollArea.Content>
                <Decision value={filtered} loading={isLoadingMedia}>
                  <Decision.Loading>
                    <LoadingSpinner className="py-6" />
                  </Decision.Loading>
                  <Decision.Empty>
                    <EmptyState
                      icon={<Film />}
                      title={state.search.trim() ? "No media items match your search" : "No media items yet"}
                      description={state.search.trim() ? "Try a different search term." : "Upload media to build your library."}
                    />
                  </Decision.Empty>
                  <Decision.Data>
                    {filtered.map((item) => (
                      <MediaListItem
                        key={item.id}
                        item={item}
                        onClick={() => setSelectedItem(item)}
                      />
                    ))}
                  </Decision.Data>
                </Decision>
              </ScrollArea.Content>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar orientation="vertical">
              <ScrollArea.Thumb />
            </ScrollArea.Scrollbar>
          </ScrollArea>
        </Card.Content>
      </Card>

      <MediaDetailDrawer
        item={selectedItem}
        open={selectedItem !== null}
        onOpenChange={(open) => { if (!open) setSelectedItem(null) }}
        onDelete={(item) => setPendingDelete(item)}
      />

      <Modal open={pendingDelete !== null} onOpenChange={(o) => { if (!o) setPendingDelete(null) }}>
        <Modal.Portal>
          <Modal.Backdrop />
          <Modal.Positioner>
            <Modal.Panel>
              <Modal.Header>
                <Label.md>Delete Media</Label.md>
              </Modal.Header>
              <Modal.Content className="p-4 flex-row gap-4">
                <TriangleAlert className="size-8 shrink-0 text-utility-red-600" />
                <Paragraph.sm className="text-secondary">
                  Are you sure you want to delete this media item? Playlist cues that reference it may be affected. This action cannot be undone.
                </Paragraph.sm>
              </Modal.Content>
              <Modal.Footer className="justify-end">
                <Button variant="secondary" onClick={() => setPendingDelete(null)}>Cancel</Button>
                <Button variant="danger" onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? "Deleting..." : "Delete Media"}
                </Button>
              </Modal.Footer>
            </Modal.Panel>
          </Modal.Positioner>
        </Modal.Portal>
      </Modal>
    </>
  )
}
