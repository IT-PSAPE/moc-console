import { Label } from "@moc/ui/components/display/text"
import { Modal } from "@moc/ui/components/overlays/modal"
import type { BroadcastFormSubmit } from "./broadcast-editor-types"
import { BroadcastForm } from "./broadcast-form"

type BroadcastModalProps = {
  onOpenChange: (open: boolean) => void
  onSubmit: (params: BroadcastFormSubmit) => Promise<void>
  open: boolean
}

export function BroadcastModal({ onOpenChange, onSubmit, open }: BroadcastModalProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} closeOnBackdropClick={false} closeOnEscape={false}>
      <Modal.Portal>
        <Modal.Backdrop />
        <Modal.Positioner>
          <Modal.FullScreenPanel className="w-full !max-w-lg landscape:!max-w-none">
            <Modal.Header>
              <Label.md>New broadcast</Label.md>
            </Modal.Header>
            <BroadcastForm open={open} onOpenChange={onOpenChange} onSubmit={onSubmit} />
          </Modal.FullScreenPanel>
        </Modal.Positioner>
      </Modal.Portal>
    </Modal>
  )
}
