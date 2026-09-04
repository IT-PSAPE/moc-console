import { Modal } from '@moc/ui/components/overlays/modal'
import { Button } from '@moc/ui/components/controls/button'
import { Label, Paragraph } from '@moc/ui/components/display/text'
import { LoadingSpinner } from '@moc/ui/components/feedback/spinner'
import { NOTIFICATION_EVENTS, type NotificationEventDefinition } from '@moc/notifications'
import { useConnectEvents } from './use-connect-events'
import { ConnectEventRow } from './connect-event-row'

export type ConnectEventsTarget =
    | { kind: 'group'; workspaceId: string; groupChatId: string; groupTitle: string; threadId: number | null; topicName: string | null }
    | { kind: 'user'; workspaceId: string; userId: string; userName: string }

type ConnectEventsModalProps = {
    target: ConnectEventsTarget | null
    onClose: () => void
}

export function ConnectEventsModal({ target, onClose }: ConnectEventsModalProps) {
    const { state, actions } = useConnectEvents(target, onClose)

    function renderEvent(event: NotificationEventDefinition) {
        return (
            <ConnectEventRow
                key={event.key}
                event={event}
                connected={state.routeByEvent.has(event.key)}
                disabled={state.pendingKey === event.key}
                onToggle={actions.toggle}
            />
        )
    }

    return (
        <Modal open={state.isOpen} onOpenChange={actions.changeOpen}>
            <Modal.Portal>
                <Modal.Backdrop />
                <Modal.Positioner>
                    <Modal.FullScreenPanel className="w-full md:max-w-lg">
                        <Modal.Header>
                            <div className="flex flex-col gap-1">
                                <Label.md>Connect events</Label.md>
                                <Paragraph.xs className="text-quaternary">{state.destinationLabel}</Paragraph.xs>
                            </div>
                        </Modal.Header>
                        <Modal.Content>
                            {state.isLoading ? <div className="flex justify-center py-6"><LoadingSpinner size="lg" /></div> : (
                                <div className="divide-y divide-tertiary px-3 py-1">
                                    {NOTIFICATION_EVENTS.map(renderEvent)}
                                </div>
                            )}
                        </Modal.Content>
                        <Modal.Footer><Modal.Close><Button variant="secondary">Done</Button></Modal.Close></Modal.Footer>
                    </Modal.FullScreenPanel>
                </Modal.Positioner>
            </Modal.Portal>
        </Modal>
    )
}
