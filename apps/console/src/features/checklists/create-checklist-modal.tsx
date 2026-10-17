import { Modal } from '@moc/ui/components/overlays/modal'
import { Button } from '@moc/ui/components/controls/button'
import { Input } from '@moc/ui/components/form/input'
import { FormField } from '@moc/ui/components/form/form-field'
import { Label } from '@moc/ui/components/display/text'
import { useCreateChecklistForm } from './use-create-checklist-form'

type CreateChecklistModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    onCreate: (checklist: { name: string; description: string }) => void
}

export function CreateChecklistModal({ open, onOpenChange, onCreate }: CreateChecklistModalProps) {
    const { state, actions } = useCreateChecklistForm(onOpenChange, onCreate)

    return (
        <Modal open={open} onOpenChange={actions.changeOpen}>
            <Modal.Portal>
                <Modal.Backdrop />
                <Modal.Positioner>
                    <Modal.FullScreenPanel className="w-full max-w-lg landscape:max-w-none">
                        <Modal.Header>
                            <Label.md>New checklist</Label.md>
                        </Modal.Header>
                        <Modal.Content>
                            <FormField label="Name" required>
                                <Input
                                    aria-label="Checklist name"
                                    name="checklist-name"
                                    autoComplete="off"
                                    placeholder="Checklist name"
                                    value={state.form.name}
                                    onChange={actions.changeName}
                                />
                            </FormField>
                            <FormField label="Description" optional>
                                <Input
                                    aria-label="Checklist description"
                                    name="checklist-description"
                                    autoComplete="off"
                                    placeholder="Brief description"
                                    value={state.form.description}
                                    onChange={actions.changeDescription}
                                />
                            </FormField>
                        </Modal.Content>
                        <Modal.Footer>
                            <Modal.Close>
                                <Button variant="secondary">Cancel</Button>
                            </Modal.Close>
                            <Button onClick={actions.submit} disabled={!state.canSubmit}>Create</Button>
                        </Modal.Footer>
                    </Modal.FullScreenPanel>
                </Modal.Positioner>
            </Modal.Portal>
        </Modal>
    )
}
