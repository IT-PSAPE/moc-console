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
                        <Modal.Content className="flex-row gap-4 p-4">
                            <TriangleAlert className="size-8 shrink-0" aria-hidden="true" />
                            <Paragraph.sm className="text-secondary">{message}</Paragraph.sm>
                        </Modal.Content>
                        <Modal.Footer className="justify-end">
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
