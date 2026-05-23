import { Modal } from '@moc/ui/components/overlays/modal'
import { Button } from '@moc/ui/components/controls/button'
import { Label, Paragraph } from '@moc/ui/components/display/text'
import { TriangleAlert } from 'lucide-react'

type RemoveAvatarModalProps = {
    open: boolean
    onConfirm: () => void
    onCancel: () => void
    isRemoving?: boolean
}

export function RemoveAvatarModal({ open, onConfirm, onCancel, isRemoving = false }: RemoveAvatarModalProps) {
    return (
        <Modal open={open} onOpenChange={(o) => { if (!o) onCancel() }}>
            <Modal.Portal>
                <Modal.Backdrop />
                <Modal.Positioner>
                    <Modal.Panel>
                        <Modal.Header>
                            <Label.md>Remove profile photo</Label.md>
                        </Modal.Header>
                        <Modal.Content className="p-4 flex-row gap-4">
                            <TriangleAlert className="size-8 shrink-0 text-utility-red-600" />
                            <Paragraph.sm className="text-secondary">
                                Your photo will be cleared and your initials will be shown instead. You can upload a new photo anytime.
                            </Paragraph.sm>
                        </Modal.Content>
                        <Modal.Footer className="justify-end">
                            <Button variant="secondary" onClick={onCancel} disabled={isRemoving}>
                                Cancel
                            </Button>
                            <Button variant="danger" onClick={onConfirm} disabled={isRemoving}>
                                {isRemoving ? 'Removing…' : 'Yes, remove'}
                            </Button>
                        </Modal.Footer>
                    </Modal.Panel>
                </Modal.Positioner>
            </Modal.Portal>
        </Modal>
    )
}
