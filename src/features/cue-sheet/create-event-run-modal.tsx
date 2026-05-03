import { Modal } from '@/components/overlays/modal'
import { Button } from '@/components/controls/button'
import { Input } from '@/components/form/input'
import { FormLabel } from '@/components/form/form-label'
import { Label } from '@/components/display/text'
import type { CueSheetEvent } from '@/types/cue-sheet'
import { formatUtcIsoForBrowserDateTimeInput, parseBrowserDateTimeInputToUtcIso } from '@/utils/browser-date-time'
import { useCallback, useEffect, useState } from 'react'

export type EventRunSubmit =
    | { kind: 'template'; template: CueSheetEvent; title: string; description: string; scheduledAt: string }
    | { kind: 'blank'; title: string; description: string; scheduledAt: string; duration: number }

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    template: CueSheetEvent | null
    onSubmit: (input: EventRunSubmit) => Promise<void> | void
}

export function CreateEventRunModal({ open, onOpenChange, template, onSubmit }: Props) {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [scheduledAt, setScheduledAt] = useState(formatUtcIsoForBrowserDateTimeInput(new Date().toISOString()))
    const [duration, setDuration] = useState(60)
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (!open) return
        setTitle(template ? `${template.title} Run` : '')
        setDescription(template ? template.description : '')
        setScheduledAt(formatUtcIsoForBrowserDateTimeInput(new Date().toISOString()))
        setDuration(template ? template.duration : 60)
    }, [open, template])

    const canSubmit = title.trim().length > 0 && scheduledAt.length > 0 && (template !== null || duration > 0) && !isSubmitting

    const handleSubmit = useCallback(async () => {
        if (!canSubmit) return
        setIsSubmitting(true)
        try {
            const scheduledIso = parseBrowserDateTimeInputToUtcIso(scheduledAt)
            if (template) {
                await onSubmit({ kind: 'template', template, title: title.trim(), description: description.trim(), scheduledAt: scheduledIso })
            } else {
                await onSubmit({ kind: 'blank', title: title.trim(), description: description.trim(), scheduledAt: scheduledIso, duration })
            }
            onOpenChange(false)
        } finally {
            setIsSubmitting(false)
        }
    }, [canSubmit, description, duration, onOpenChange, onSubmit, scheduledAt, template, title])

    return (
        <Modal.Root open={open} onOpenChange={onOpenChange}>
            <Modal.Portal>
                <Modal.Backdrop />
                <Modal.Positioner>
                    <Modal.Panel className="w-full max-w-md">
                        <Modal.Header>
                            <Label.md>{template ? `New Run from "${template.title}"` : 'New Blank Event Run'}</Label.md>
                        </Modal.Header>
                        <Modal.Content>
                            <div className="flex flex-col gap-4 p-4">
                                <div className="flex flex-col gap-1.5">
                                    <FormLabel label="Title" required />
                                    <Input placeholder="Event title" value={title} onChange={(e) => setTitle(e.target.value)} />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <FormLabel label="Description" optional />
                                    <Input placeholder="Brief description" value={description} onChange={(e) => setDescription(e.target.value)} />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <FormLabel label="Scheduled" required />
                                    <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                                </div>
                                {!template && (
                                    <div className="flex flex-col gap-1.5">
                                        <FormLabel label="Duration (minutes)" required />
                                        <Input type="number" value={String(duration)} onChange={(e) => setDuration(Number(e.target.value) || 0)} />
                                    </div>
                                )}
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
        </Modal.Root>
    )
}
