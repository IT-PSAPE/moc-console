import { TriangleAlert } from "lucide-react"
import { Button } from "../controls/button"
import { Label, Paragraph } from "../display/text"
import { Modal } from "./modal"

type UnsavedChangesDialogProps = {
    open: boolean
    onSave: () => void
    onDiscard: () => void
    onCancel: () => void
    isSaving?: boolean
    message?: string
}

const defaultMessage = "You have unsaved changes. Would you like to save them before closing?"

export function UnsavedChangesDialog({ open, onSave, onDiscard, onCancel, isSaving = false, message = defaultMessage }: UnsavedChangesDialogProps) {
    function handleOpenChange(nextOpen: boolean) {
        if (!nextOpen) onCancel()
    }

    return (
        <Modal open={open} onOpenChange={handleOpenChange} closeOnBackdropClick={false}>
            <Modal.Portal>
                <Modal.Backdrop />
                <Modal.Positioner>
                    <Modal.Panel>
                        <Modal.Header><Label.md>Unsaved changes</Label.md></Modal.Header>
                        <Modal.Content className="flex-row items-start">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warning text-warning">
                                <TriangleAlert className="size-5" aria-hidden="true" />
                            </span>
                            <Paragraph.sm className="text-tertiary">{message}</Paragraph.sm>
                        </Modal.Content>
                        <Modal.Footer>
                            <Button variant="danger-secondary" onClick={onDiscard} className="mr-auto">Discard</Button>
                            <Button variant="secondary" onClick={onCancel}>Cancel</Button>
                            <Button onClick={onSave} disabled={isSaving}>{isSaving ? "Saving…" : "Save changes"}</Button>
                        </Modal.Footer>
                    </Modal.Panel>
                </Modal.Positioner>
            </Modal.Portal>
        </Modal>
    )
}
