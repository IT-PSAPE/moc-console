import { Modal } from '@moc/ui/components/overlays/modal'
import { Button } from '@moc/ui/components/controls/button'
import { Input } from '@moc/ui/components/form/input'
import { FormLabel } from '@moc/ui/components/form/form-label'
import { Label } from '@moc/ui/components/display/text'
import type { Checklist } from '@moc/types/cue-sheet'
import { formatUtcIsoForBrowserDateTimeInput, parseBrowserDateTimeInputToUtcIso } from '@moc/utils/browser-date-time'
import { useCallback, useEffect, useState } from 'react'

export type ChecklistRunSubmit =
    | { kind: 'template'; template: Checklist; name: string; description: string; scheduledAt: string }
    | { kind: 'blank'; name: string; description: string; scheduledAt: string }

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    template: Checklist | null
    onSubmit: (input: ChecklistRunSubmit) => Promise<void> | void
}

export function CreateChecklistRunModal({ open, onOpenChange, template, onSubmit }: Props) {
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [scheduledAt, setScheduledAt] = useState(formatUtcIsoForBrowserDateTimeInput(new Date().toISOString()))
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (!open) return
        setName(template ? `${template.name} Run` : '')
        setDescription(template ? template.description : '')
        setScheduledAt(formatUtcIsoForBrowserDateTimeInput(new Date().toISOString()))
    }, [open, template])

    const canSubmit = name.trim().length > 0 && scheduledAt.length > 0 && !isSubmitting

    const handleSubmit = useCallback(async () => {
        if (!canSubmit) return
        setIsSubmitting(true)
        try {
            const scheduledIso = parseBrowserDateTimeInputToUtcIso(scheduledAt)
            if (template) {
                await onSubmit({ kind: 'template', template, name: name.trim(), description: description.trim(), scheduledAt: scheduledIso })
            } else {
                await onSubmit({ kind: 'blank', name: name.trim(), description: description.trim(), scheduledAt: scheduledIso })
            }
            onOpenChange(false)
        } finally {
            setIsSubmitting(false)
        }
    }, [canSubmit, description, name, onOpenChange, onSubmit, scheduledAt, template])

    return (
        <Modal open={open} onOpenChange={onOpenChange}>
            <Modal.Portal>
                <Modal.Backdrop />
                <Modal.Positioner>
                    <Modal.Panel className="w-full max-w-md">
                        <Modal.Header>
                            <Label.md>{template ? `New Run from "${template.name}"` : 'New Blank Checklist Run'}</Label.md>
                        </Modal.Header>
                        <Modal.Content>
                            <div className="flex flex-col gap-4 p-4">
                                <div className="flex flex-col gap-1.5">
                                    <FormLabel label="Name" required />
                                    <Input placeholder="Checklist name" value={name} onChange={(e) => setName(e.target.value)} />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <FormLabel label="Description" optional />
                                    <Input placeholder="Brief description" value={description} onChange={(e) => setDescription(e.target.value)} />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <FormLabel label="Scheduled" required />
                                    <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                                </div>
                            </div>
                        </Modal.Content>
                        <Modal.Footer>
                            <Modal.Close>
                                <Button variant="secondary">Cancel</Button>
                            </Modal.Close>
                            <Button onClick={handleSubmit} disabled={!canSubmit}>
                                {isSubmitting ? 'Creating...' : 'Create'}
                            </Button>
                        </Modal.Footer>
                    </Modal.Panel>
                </Modal.Positioner>
            </Modal.Portal>
        </Modal>
    )
}
