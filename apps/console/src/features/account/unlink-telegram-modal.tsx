import { Modal } from '@moc/ui/components/overlays/modal'
import { Button } from '@moc/ui/components/controls/button'
import { Label, Paragraph } from '@moc/ui/components/display/text'
import { TriangleAlert } from 'lucide-react'

type UnlinkTelegramModalProps = {
    open: boolean
    onConfirm: () => void
    onCancel: () => void
    isUnlinking?: boolean
}

export function UnlinkTelegramModal({ open, onConfirm, onCancel, isUnlinking = false }: UnlinkTelegramModalProps) {
    return (
        <Modal open={open} onOpenChange={(o) => { if (!o) onCancel() }}>
            <Modal.Portal>
                <Modal.Backdrop />
                <Modal.Positioner>
                    <Modal.Panel>
                        <Modal.Header>
                            <Label.md>Disconnect Telegram</Label.md>
                        </Modal.Header>
                        <Modal.Content className="p-4 flex-row gap-4">
                            <TriangleAlert className="size-8 shrink-0 text-utility-red-600" />
                            <Paragraph.sm className="text-secondary">
                                You'll stop receiving MOC Console notifications in Telegram. You can reconnect anytime from this page.
                            </Paragraph.sm>
                        </Modal.Content>
                        <Modal.Footer className="justify-end">
                            <Button variant="secondary" onClick={onCancel} disabled={isUnlinking}>
                                Cancel
                            </Button>
                            <Button variant="danger" onClick={onConfirm} disabled={isUnlinking}>
                                {isUnlinking ? 'Disconnecting…' : 'Yes, disconnect'}
                            </Button>
                        </Modal.Footer>
                    </Modal.Panel>
                </Modal.Positioner>
            </Modal.Portal>
        </Modal>
    )
}
