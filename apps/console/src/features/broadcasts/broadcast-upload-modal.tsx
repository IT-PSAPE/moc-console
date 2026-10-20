import type { Broadcast } from "@moc/types/broadcast/broadcast"
import { Label } from "@moc/ui/components/display/text"
import { Modal } from "@moc/ui/components/overlays/modal"
import type { BroadcastUploadSubmit } from "./broadcast-editor-types"
import { BroadcastUploadForm } from "./broadcast-upload-form"

type BroadcastUploadModalProps = { broadcast: Broadcast; disabled?: boolean; onOpenChange: (open: boolean) => void; onSubmit: (params: BroadcastUploadSubmit) => Promise<void>; open: boolean }

export function BroadcastUploadModal({ broadcast, disabled, onOpenChange, onSubmit, open }: BroadcastUploadModalProps) {
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && disabled) return
    onOpenChange(nextOpen)
  }

  return (
    <Modal open={open} onOpenChange={handleOpenChange} closeOnBackdropClick={false} closeOnEscape={false}>
      <Modal.Portal>
        <Modal.Backdrop />
        <Modal.Positioner>
          <Modal.FullScreenPanel className="w-full !max-w-lg landscape:!max-w-none">
            <Modal.Header>
              <Label.md>Upload files</Label.md>
            </Modal.Header>
            <BroadcastUploadForm broadcast={broadcast} disabled={disabled} open={open} onOpenChange={handleOpenChange} onSubmit={onSubmit} />
          </Modal.FullScreenPanel>
        </Modal.Positioner>
      </Modal.Portal>
    </Modal>
  )
}
