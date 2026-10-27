import { ItemDiscussionPanel } from '@/features/item-discussion/item-discussion-panel'
import { Button } from '@moc/ui/components/controls/button'
import { Label, Paragraph } from '@moc/ui/components/display/text'
import { Modal } from '@moc/ui/components/overlays/modal'
import { useScheduledMessagesContext } from '../scheduled-messages-context'

export function ScheduledOccurrenceHistory() {
    const { state, actions } = useScheduledMessagesContext()
    const occurrence = state.details

    return (
        <Modal open={occurrence !== null} onOpenChange={actions.changeDetailsOpen}>
            <Modal.Portal>
                <Modal.Backdrop />
                <Modal.Positioner>
                    <Modal.FullScreenPanel className="max-w-lg landscape:!max-w-none">
                        <Modal.Header><Label.md>{occurrence?.label ?? 'Message activity'}</Label.md></Modal.Header>
                        <Modal.Content>
                            {occurrence && (
                                <>
                                    <Paragraph.sm className="text-tertiary">{occurrence.summary}</Paragraph.sm>
                                    <ItemDiscussionPanel kind="scheduled-message" itemId={occurrence.id} enabled={occurrence !== null} />
                                </>
                            )}
                        </Modal.Content>
                        <Modal.Footer><Modal.Close><Button variant="secondary">Close</Button></Modal.Close></Modal.Footer>
                    </Modal.FullScreenPanel>
                </Modal.Positioner>
            </Modal.Portal>
        </Modal>
    )
}
