import { Modal } from '@/components/overlays/modal'
import { Button } from '@/components/controls/button'
import { Label, Paragraph } from '@/components/display/text'
import { TriangleAlert } from 'lucide-react'

type UnsavedChangesModalProps = {
    open: boolean
    onSave: () => void
    onDiscard: () => void
    onCancel: () => void
    isSaving?: boolean
}

export function UnsavedChangesModal({ open, onSave, onDiscard, onCancel, isSaving = false }: UnsavedChangesModalProps) {
    return (
        <Modal.Root open={open} onOpenChange={(o) => { if (!o) onCancel() }}>
            <Modal.Portal>
                <Modal.Backdrop />
                <Modal.Positioner>
                    <Modal.Panel>
                        <Modal.Header>
                            <Label.md>Unsaved Changes</Label.md>
                        </Modal.Header>
                        <Modal.Content className="p-4 flex-row gap-4">
                            <TriangleAlert className='size-8 shrink-0' />
                            <Paragraph.sm className="text-secondary">
                                You are about to close this request with unsaved changes. Would you like to save these changes before closing?
                            </Paragraph.sm>
                        </Modal.Content>
                        <Modal.Footer className="justify-end">
                            <Button variant="danger-secondary" onClick={onDiscard} className='mr-auto'>
                                Discard
                            </Button>
                            <Button variant="secondary" onClick={onCancel}>
                                Cancel
                            </Button>
                            <Button onClick={onSave} disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </Modal.Footer>
                    </Modal.Panel>
                </Modal.Positioner>
            </Modal.Portal>
        </Modal.Root>
    )
}
