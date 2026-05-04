import { Modal } from '@/components/overlays/modal'
import { Button } from '@/components/controls/button'
import { Input } from '@/components/form/input'
import { FormLabel } from '@/components/form/form-label'
import { Label } from '@/components/display/text'
import { useState } from 'react'

type EventFormValues = { title: string; description: string; duration: number }

type EditEventModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    initial: EventFormValues
    onSave: (next: EventFormValues) => void
}

export function EditEventModal({ open, onOpenChange, initial, onSave }: EditEventModalProps) {
    return (
        <Modal.Root open={open} onOpenChange={onOpenChange}>
            <Modal.Portal>
                <Modal.Backdrop />
                <Modal.Positioner>
                    <Modal.Panel className="w-full max-w-md">
                        {/* Children of Modal.Portal only mount while open, so the inner form's
                            useState(initial) re-seeds on each open — no effect-driven sync,
                            no risk of a parent re-render clobbering in-progress edits. */}
                        <EditEventForm initial={initial} onSave={onSave} onOpenChange={onOpenChange} />
                    </Modal.Panel>
                </Modal.Positioner>
            </Modal.Portal>
        </Modal.Root>
    )
}

type EditEventFormProps = {
    initial: EventFormValues
    onSave: (next: EventFormValues) => void
    onOpenChange: (open: boolean) => void
}

function EditEventForm({ initial, onSave, onOpenChange }: EditEventFormProps) {
    const [form, setForm] = useState(initial)

    const canSubmit = form.title.trim().length > 0 && form.duration > 0

    function handleSubmit() {
        if (!canSubmit) return
        onSave({
            title: form.title.trim(),
            description: form.description.trim(),
            duration: form.duration,
        })
        onOpenChange(false)
    }

    return (
        <>
            <Modal.Header>
                <Label.md>Edit Event</Label.md>
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
                <Button onClick={handleSubmit} disabled={!canSubmit}>Save</Button>
            </Modal.Footer>
        </>
    )
}
