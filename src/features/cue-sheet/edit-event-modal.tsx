import { Modal } from '@/components/overlays/modal'
import { Button } from '@/components/controls/button'
import { Input } from '@/components/form/input'
import { FormLabel } from '@/components/form/form-label'
import { Label } from '@/components/display/text'
import { useEffect, useState } from 'react'

type EditEventModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    initial: { title: string; description: string; duration: number }
    onSave: (next: { title: string; description: string; duration: number }) => void
}

export function EditEventModal({ open, onOpenChange, initial, onSave }: EditEventModalProps) {
    const [form, setForm] = useState(initial)

    useEffect(() => {
        if (open) setForm(initial)
    }, [open, initial])

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
        <Modal.Root open={open} onOpenChange={onOpenChange}>
            <Modal.Portal>
                <Modal.Backdrop />
                <Modal.Positioner>
                    <Modal.Panel className="w-full max-w-md">
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
                    </Modal.Panel>
                </Modal.Positioner>
            </Modal.Portal>
        </Modal.Root>
    )
}
