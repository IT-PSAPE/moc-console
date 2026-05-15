import { Button } from '@moc/ui/components/controls/button'
import { Label, Paragraph } from '@moc/ui/components/display/text'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { Modal } from '@moc/ui/components/overlays/modal'
import {
    captureBugReportContext,
    submitBugReport,
    type BugReportErrorContext,
} from '@moc/data/bug-reports'
import { useAuth } from '@/lib/auth-context'
import { AlertTriangle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

const MAX_LENGTH = 2000
const MIN_LENGTH = 10

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    errorContext?: BugReportErrorContext | null
}

export function ReportBugModal({ open, onOpenChange, errorContext }: Props) {
    const { profile } = useAuth()
    const { toast } = useFeedback()
    const [description, setDescription] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (!open) {
            setDescription('')
            setIsSubmitting(false)
        }
    }, [open])

    const trimmedLength = description.trim().length
    const canSubmit = !isSubmitting && trimmedLength >= MIN_LENGTH && trimmedLength <= MAX_LENGTH && profile

    const handleSubmit = useCallback(async () => {
        if (!profile || !canSubmit) return
        setIsSubmitting(true)
        try {
            const context = captureBugReportContext()
            await submitBugReport({
                userId: profile.id,
                description: description.trim(),
                ...context,
                errorContext: errorContext ?? null,
            })
            toast({ title: 'Bug report sent', description: 'Thanks — the team will take a look.', variant: 'success' })
            onOpenChange(false)
        } catch (error) {
            toast({
                title: 'Could not send report',
                description: error instanceof Error ? error.message : 'Please try again.',
                variant: 'error',
            })
        } finally {
            setIsSubmitting(false)
        }
    }, [canSubmit, description, errorContext, onOpenChange, profile, toast])

    const remaining = MAX_LENGTH - description.length

    return (
        <Modal open={open} onOpenChange={onOpenChange}>
            <Modal.Portal>
                <Modal.Backdrop />
                <Modal.Positioner>
                    <Modal.Panel className="w-full !max-w-md">
                        <Modal.Header>
                            <div className="flex flex-col gap-0.5">
                                <Label.md>Report a bug</Label.md>
                                <Paragraph.xs className="text-tertiary">
                                    Describe what went wrong. We'll attach your device and page info automatically.
                                </Paragraph.xs>
                            </div>
                        </Modal.Header>
                        <Modal.Content>
                            <div className="flex flex-col gap-3 p-4">
                                {errorContext && (
                                    <div className="flex items-start gap-2 rounded-md border border-utility-red-200 bg-utility-red-50 p-2.5">
                                        <AlertTriangle className="size-4 shrink-0 mt-0.5 text-utility-red-600" />
                                        <Paragraph.xs className="text-utility-red-700">
                                            An error report from this page will be attached automatically.
                                            You don't need to describe the technical details — just tell us what you were doing.
                                        </Paragraph.xs>
                                    </div>
                                )}
                                <textarea
                                    autoFocus
                                    rows={6}
                                    maxLength={MAX_LENGTH}
                                    placeholder="What were you trying to do? What did you see vs. what you expected?"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 paragraph-sm focus:border-brand focus:outline-none focus:ring-3 focus:ring-border-brand/10 resize-none"
                                />
                                <div className="flex items-center justify-between">
                                    <Paragraph.xs className="text-quaternary">
                                        {trimmedLength < MIN_LENGTH
                                            ? `At least ${MIN_LENGTH} characters`
                                            : 'Thanks for the detail'}
                                    </Paragraph.xs>
                                    <Paragraph.xs className={remaining < 100 ? 'text-error' : 'text-quaternary'}>
                                        {remaining}
                                    </Paragraph.xs>
                                </div>
                            </div>
                        </Modal.Content>
                        <Modal.Footer>
                            <Modal.Close>
                                <Button variant="secondary">Cancel</Button>
                            </Modal.Close>
                            <Button onClick={handleSubmit} disabled={!canSubmit}>
                                {isSubmitting ? 'Sending...' : 'Send report'}
                            </Button>
                        </Modal.Footer>
                    </Modal.Panel>
                </Modal.Positioner>
            </Modal.Portal>
        </Modal>
    )
}
