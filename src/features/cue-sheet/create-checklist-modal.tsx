import { Modal } from '@/components/overlays/modal'
import { Button } from '@/components/controls/button'
import { Input } from '@/components/form/input'
import { FormLabel } from '@/components/form/form-label'
import { Label } from '@/components/display/text'
import { useCallback, useState } from 'react'

type CreateChecklistModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    onCreate: (checklist: { name: string; description: string }) => void
}

const initialState = { name: '', description: '' }

export function CreateChecklistModal({ open, onOpenChange, onCreate }: CreateChecklistModalProps) {
    const [form, setForm] = useState(initialState)

    const resetForm = useCallback(() => setForm(initialState), [])

    const canSubmit = form.name.trim().length > 0

    const handleSubmit = useCallback(() => {
        if (!canSubmit) return
        onCreate({
            name: form.name.trim(),
            description: form.description.trim(),
        })
        resetForm()
    }, [canSubmit, form, onCreate, resetForm])

    return (
        <Modal.Root open={open} onOpenChange={(next) => { onOpenChange(next); if (!next) resetForm() }}>
            <Modal.Portal>
                <Modal.Backdrop />
                <Modal.Positioner>
                    <Modal.Panel className="max-w-md">
                        <Modal.Header>
                            <Label.md>New Checklist</Label.md>
                        </Modal.Header>
                        <Modal.Content>
                            <div className="flex flex-col gap-4 p-4">
                                <div className="flex flex-col gap-1.5">
                                    <FormLabel label="Name" required />
                                    <Input
                                        placeholder="Checklist name"
                                        value={form.name}
                                        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <FormLabel label="Description" optional />
                                    <Input
                                        placeholder="Brief description"
                                        value={form.description}
                                        onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </Modal.Content>
                        <Modal.Footer>
                            <Modal.Close>
                                <Button variant="secondary">Cancel</Button>
                            </Modal.Close>
                            <Button onClick={handleSubmit} disabled={!canSubmit}>Create</Button>
                        </Modal.Footer>
                    </Modal.Panel>
                </Modal.Positioner>
            </Modal.Portal>
        </Modal.Root>
    )
}
