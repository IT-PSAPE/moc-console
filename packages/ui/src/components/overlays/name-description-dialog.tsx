import type { ChangeEvent } from 'react'
import { Modal } from './modal'
import { Button } from '../controls/button'
import { Input } from '../form/input'
import { TextArea } from '../form/text-area'
import { FormLabel } from '../form/form-label'
import { Label } from '../display/text'

type NameDescriptionDialogProps = {
    open: boolean
    title: string
    submitLabel: string
    name: string
    description: string
    canSubmit: boolean
    isSaving: boolean
    onOpenChange: (open: boolean) => void
    onNameChange: (event: ChangeEvent<HTMLInputElement>) => void
    onDescriptionChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
    onSubmit: () => void
}

export function NameDescriptionDialog({ open, title, submitLabel, name, description, canSubmit, isSaving, onOpenChange, onNameChange, onDescriptionChange, onSubmit }: NameDescriptionDialogProps) {
    return (
        <Modal open={open} onOpenChange={onOpenChange}>
            <Modal.Portal><Modal.Backdrop /><Modal.Positioner>
                <Modal.FullScreenPanel className="w-full md:max-w-md">
                    <Modal.Header><Label.md>{title}</Label.md></Modal.Header>
                    <Modal.Content>
                        <div className="flex flex-col gap-4 p-4">
                            <div className="flex flex-col gap-1.5">
                                <FormLabel label="Name" required />
                                <Input aria-label="Name" name="option-name" autoComplete="off" maxLength={120} value={name} onChange={onNameChange} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <FormLabel label="Description" optional />
                                <TextArea aria-label="Description" name="option-description" value={description} onChange={onDescriptionChange} />
                            </div>
                        </div>
                    </Modal.Content>
                    <Modal.Footer>
                        <Modal.Close><Button variant="secondary" disabled={isSaving}>Cancel</Button></Modal.Close>
                        <Button onClick={onSubmit} disabled={!canSubmit || isSaving}>{isSaving ? 'Saving…' : submitLabel}</Button>
                    </Modal.Footer>
                </Modal.FullScreenPanel>
            </Modal.Positioner></Modal.Portal>
        </Modal>
    )
}
