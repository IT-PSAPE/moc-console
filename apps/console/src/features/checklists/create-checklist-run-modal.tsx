import { Modal } from '@moc/ui/components/overlays/modal'
import { Button } from '@moc/ui/components/controls/button'
import { Input } from '@moc/ui/components/form/input'
import { FormField } from '@moc/ui/components/form/form-field'
import { Label } from '@moc/ui/components/display/text'
import type { Checklist } from '@moc/types/checklists'
import { useCreateChecklistRun, type ChecklistRunSubmit } from './use-create-checklist-run'

type Props = {
    initialName?: string
    open: boolean
    onOpenChange: (open: boolean) => void
    template: Checklist | null
    onSubmit: (input: ChecklistRunSubmit) => Promise<void> | void
}

export function CreateChecklistRunModal({ open, onOpenChange, template, onSubmit, initialName }: Props) {
    const { state, actions, meta } = useCreateChecklistRun({ open, onOpenChange, onSubmit, template, initialName })

    return (
        <Modal open={open} onOpenChange={onOpenChange}>
            <Modal.Portal>
                <Modal.Backdrop />
                <Modal.Positioner>
                    <Modal.FullScreenPanel className="w-full max-w-lg landscape:max-w-none">
                        <Modal.Header>
                            <Label.md>{meta.title}</Label.md>
                        </Modal.Header>
                        <Modal.Content>
                            <FormField label="Name" required>
                                <Input aria-label="Checklist name" name="checklist-name" autoComplete="off" placeholder="Checklist name" value={state.name} onChange={actions.changeName} />
                            </FormField>
                            <FormField label="Description" optional>
                                <Input aria-label="Checklist description" name="checklist-description" autoComplete="off" placeholder="Brief description" value={state.description} onChange={actions.changeDescription} />
                            </FormField>
                        </Modal.Content>
                        <Modal.Footer>
                            <Modal.Close>
                                <Button variant="secondary">Cancel</Button>
                            </Modal.Close>
                            <Button onClick={actions.submit} disabled={!state.canSubmit}>
                                {state.isSubmitting ? 'Creating…' : 'Create'}
                            </Button>
                        </Modal.Footer>
                    </Modal.FullScreenPanel>
                </Modal.Positioner>
            </Modal.Portal>
        </Modal>
    )
}
