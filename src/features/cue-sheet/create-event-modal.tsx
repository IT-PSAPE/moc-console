import { Modal } from '@/components/overlays/modal'
import { Button } from '@/components/controls/button'
import { Input } from '@/components/form/input'
import { FormLabel } from '@/components/form/form-label'
import { Label } from '@/components/display/text'
import { useCallback, useState } from 'react'

type CreateEventModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    onCreate: (event: { title: string; description: string; duration: number }) => void
}

const initialState = { title: '', description: '', duration: 60 }

export function CreateEventModal({ open, onOpenChange, onCreate }: CreateEventModalProps) {
    const [form, setForm] = useState(initialState)

    const resetForm = useCallback(() => setForm(initialState), [])

    const canSubmit = form.title.trim().length > 0

    const handleSubmit = useCallback(() => {
        if (!canSubmit) return
        onCreate({
            title: form.title.trim(),
            description: form.description.trim(),
            duration: form.duration,
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
                            <Label.md>New Event</Label.md>
                        </Modal.Header>
                        <Modal.Content>
                            <div className="flex flex-col gap-4 p-4">
                                <div className="flex flex-col gap-1.5">
                                    <FormLabel label="Title" required />
                                    <Input
                                        placeholder="Event name"
                                        value={form.title}
                                        onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
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
                                <div className="flex flex-col gap-1.5">
                                    <FormLabel label="Duration (minutes)" required />
                                    <Input
                                        type="number"
                                        placeholder="Duration in minutes"
                                        value={String(form.duration)}
                                        onChange={(e) => setForm((prev) => ({ ...prev, duration: Number(e.target.value) || 0 }))}
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
