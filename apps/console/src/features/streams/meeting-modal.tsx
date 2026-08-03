import { Modal } from "@moc/ui/components/overlays/modal"
import { Label } from "@moc/ui/components/display/text"
import type { ZoomMeeting } from "@moc/types/streams/zoom"
import type { CreateMeetingParams } from "@/data/mutate-zoom"
import { MeetingForm } from "./meeting-form"

type MeetingModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (params: CreateMeetingParams) => Promise<void> | void
  meeting?: ZoomMeeting | null
}

export function MeetingModal({ open, onOpenChange, onSubmit, meeting }: MeetingModalProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <Modal.Portal>
        <Modal.Backdrop />
        <Modal.Positioner>
          <Modal.FullScreenPanel className="w-full md:max-w-md">
            <Modal.Header>
              <Label.md>{meeting ? "Edit meeting" : "Schedule meeting"}</Label.md>
            </Modal.Header>
            <MeetingForm open={open} onOpenChange={onOpenChange} onSubmit={onSubmit} meeting={meeting} />
          </Modal.FullScreenPanel>
        </Modal.Positioner>
      </Modal.Portal>
    </Modal>
  )
}
