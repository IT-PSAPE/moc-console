import { Modal } from '@moc/ui/components/overlays/modal'
import { Button } from '@moc/ui/components/controls/button'
import { Label, Paragraph } from '@moc/ui/components/display/text'
import { TriangleAlert } from 'lucide-react'

type UnsavedChangesModalProps = {
    open: boolean
    onSave: () => void
    onDiscard: () => void
    onCancel: () => void
    isSaving?: boolean
    message?: string
}

const DEFAULT_MESSAGE =
    'You are about to close this request with unsaved changes. Would you like to save these changes before closing?'

export function UnsavedChangesModal({ open, onSave, onDiscard, onCancel, isSaving = false, message = DEFAULT_MESSAGE }: UnsavedChangesModalProps) {
    function handleOpenChange(nextOpen: boolean) {
        if (!nextOpen) onCancel()
    }

    return (
        <Modal open={open} onOpenChange={handleOpenChange}>
            <Modal.Portal>
                <Modal.Backdrop />
                <Modal.Positioner>
                    <Modal.Panel>
                        <Modal.Header>
                            <Label.md>Unsaved changes</Label.md>
                        </Modal.Header>
                        <Modal.Content className="flex-row">
                            <TriangleAlert className='size-8 shrink-0' />
                            <Paragraph.sm className="text-secondary">
                                {message}
                            </Paragraph.sm>
                        </Modal.Content>
                        <Modal.Footer>
                            <Button variant="danger" onClick={onDiscard}>
                                Discard
                            </Button>
                            <Button variant="secondary" onClick={onCancel}>
                                Cancel
                            </Button>
                            <Button onClick={onSave} disabled={isSaving}>
                                {isSaving ? 'Saving…' : 'Save changes'}
                            </Button>
                        </Modal.Footer>
                    </Modal.Panel>
                </Modal.Positioner>
            </Modal.Portal>
        </Modal>
    )
}
