import { Modal } from '@moc/ui/components/overlays/modal'
import { Button } from '@moc/ui/components/controls/button'
import { Input } from '@moc/ui/components/form/input'
import { DateTimeFields } from '@moc/ui/components/form/date-time-fields'
import { FormLabel } from '@moc/ui/components/form/form-label'
import { Label } from '@moc/ui/components/display/text'
import type { Checklist } from '@moc/types/checklists'
import { useCreateChecklistRun, type ChecklistRunSubmit } from './use-create-checklist-run'

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    template: Checklist | null
    onSubmit: (input: ChecklistRunSubmit) => Promise<void> | void
}

export function CreateChecklistRunModal({ open, onOpenChange, template, onSubmit }: Props) {
    const { state, actions, meta } = useCreateChecklistRun({ open, onOpenChange, onSubmit, template })

    return (
        <Modal open={open} onOpenChange={onOpenChange}>
            <Modal.Portal>
                <Modal.Backdrop />
                <Modal.Positioner>
                    <Modal.FullScreenPanel className="w-full md:max-w-md">
                        <Modal.Header>
                            <Label.md>{meta.title}</Label.md>
                        </Modal.Header>
                        <Modal.Content>
                            <div className="flex flex-col gap-4 p-4">
                                <div className="flex flex-col gap-1.5">
                                    <FormLabel label="Name" required />
                                    <Input aria-label="Checklist name" name="checklist-name" autoComplete="off" placeholder="Checklist name" value={state.name} onChange={actions.changeName} />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <FormLabel label="Description" optional />
                                    <Input aria-label="Checklist description" name="checklist-description" autoComplete="off" placeholder="Brief description" value={state.description} onChange={actions.changeDescription} />
                                </div>
                                <DateTimeFields label="Scheduled" name="scheduled" required value={state.scheduledAt} onChange={actions.setScheduledAt} />
                            </div>
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
