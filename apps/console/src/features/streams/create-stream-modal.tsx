import type { CreateMeetingParams } from "@/data/mutate-zoom"
import { Label } from "@moc/ui/components/display/text"
import { Modal } from "@moc/ui/components/overlays/modal"
import { Tabs } from "@moc/ui/components/layout/tabs"
import type { StreamPreset } from "@moc/types/streams/stream"
import { MeetingForm } from "./meeting-form"
import { StreamForm } from "./stream-form"
import { StreamProviderIcon } from "./stream-provider-icon"
import type { StreamFormData } from "./use-stream-form"

type CreateStreamModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  youtubeAvailable: boolean
  zoomAvailable: boolean
  youtubePreset: StreamPreset | null
  onCreateYouTube: (params: StreamFormData) => Promise<void> | void
  onCreateZoom: (params: CreateMeetingParams) => Promise<void> | void
}

export function CreateStreamModal({ open, onOpenChange, youtubeAvailable, zoomAvailable, youtubePreset, onCreateYouTube, onCreateZoom }: CreateStreamModalProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <Modal.Portal>
        <Modal.Backdrop />
        <Modal.Positioner>
          <Modal.FullScreenPanel className="w-full md:!max-w-lg">
            <Tabs defaultTab={youtubeAvailable ? "youtube" : "zoom"} className="flex min-h-0 flex-1 flex-col">
              <Modal.Header><Label.md>New stream</Label.md></Modal.Header>
              <Tabs.List className="shrink-0 px-4 pt-1">
                {youtubeAvailable ? (
                  <Tabs.Tab value="youtube" className="gap-2">
                    <StreamProviderIcon provider="youtube" decorative />
                    YouTube
                  </Tabs.Tab>
                ) : null}
                {zoomAvailable ? (
                  <Tabs.Tab value="zoom" className="gap-2">
                    <StreamProviderIcon provider="zoom" decorative />
                    Zoom
                  </Tabs.Tab>
                ) : null}
              </Tabs.List>
              <Tabs.Panels className="contents">
                {youtubeAvailable ? (
                  <Tabs.Panel value="youtube" className="contents">
                    <StreamForm open={open} onOpenChange={onOpenChange} onSubmit={onCreateYouTube} preset={youtubePreset} />
                  </Tabs.Panel>
                ) : null}
                {zoomAvailable ? (
                  <Tabs.Panel value="zoom" className="contents">
                    <MeetingForm open={open} onOpenChange={onOpenChange} onSubmit={onCreateZoom} />
                  </Tabs.Panel>
                ) : null}
              </Tabs.Panels>
            </Tabs>
          </Modal.FullScreenPanel>
        </Modal.Positioner>
      </Modal.Portal>
    </Modal>
  )
}
