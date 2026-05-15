import { Button } from '@moc/ui/components/controls/button'
import { Label, Paragraph } from '@moc/ui/components/display/text'
import { LoadingSpinner, Spinner } from '@moc/ui/components/feedback/spinner'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { Modal } from '@moc/ui/components/overlays/modal'
import {
    createEventShare,
    fetchEventShare,
    revokeEventShare,
    updateEventShare,
    type EventShare,
} from '@moc/data/event-shares'
import { routes } from '@/screens/console-routes'
import { Check, Copy, Link2, Power, Radio } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    eventId: string
    eventTitle: string
}

function buildShareUrl(token: string): string {
    if (typeof window === 'undefined') return `/${routes.publicEventShare.replace(':token', token)}`
    return `${window.location.origin}/${routes.publicEventShare.replace(':token', token)}`
}

export function ShareEventModal({ open, onOpenChange, eventId, eventTitle }: Props) {
    const { toast } = useFeedback()
    const [share, setShare] = useState<EventShare | null>(null)
    const [loading, setLoading] = useState(false)
    const [busy, setBusy] = useState(false)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        if (!open) {
            setCopied(false)
            return
        }
        let active = true
        setLoading(true)
        fetchEventShare(eventId)
            .then((row) => {
                if (active) setShare(row)
            })
            .catch((error) => {
                toast({
                    title: 'Could not load share',
                    description: error instanceof Error ? error.message : 'Try again later.',
                    variant: 'error',
                })
            })
            .finally(() => {
                if (active) setLoading(false)
            })
        return () => {
            active = false
        }
    }, [eventId, open, toast])

    const handleCreate = useCallback(async () => {
        setBusy(true)
        try {
            const next = await createEventShare(eventId, { liveSyncEnabled: true })
            setShare(next)
            toast({ title: 'Share link created', variant: 'success' })
        } catch (error) {
            toast({
                title: 'Could not create share',
                description: error instanceof Error ? error.message : 'Try again.',
                variant: 'error',
            })
        } finally {
            setBusy(false)
        }
    }, [eventId, toast])

    const handleToggleLiveSync = useCallback(async (enabled: boolean) => {
        if (!share) return
        setBusy(true)
        try {
            const next = await updateEventShare(share.id, { liveSyncEnabled: enabled })
            setShare(next)
        } catch (error) {
            toast({
                title: 'Could not update share',
                description: error instanceof Error ? error.message : 'Try again.',
                variant: 'error',
            })
        } finally {
            setBusy(false)
        }
    }, [share, toast])

    const handleRevoke = useCallback(async () => {
        if (!share) return
        setBusy(true)
        try {
            await revokeEventShare(share.id)
            setShare(null)
            toast({ title: 'Share link revoked', variant: 'success' })
        } catch (error) {
            toast({
                title: 'Could not revoke share',
                description: error instanceof Error ? error.message : 'Try again.',
                variant: 'error',
            })
        } finally {
            setBusy(false)
        }
    }, [share, toast])

    const handleCopy = useCallback(async () => {
        if (!share) return
        try {
            await navigator.clipboard.writeText(buildShareUrl(share.shareToken))
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1500)
        } catch {
            toast({ title: 'Could not copy link', variant: 'error' })
        }
    }, [share, toast])

    return (
        <Modal open={open} onOpenChange={onOpenChange}>
            <Modal.Portal>
                <Modal.Backdrop />
                <Modal.Positioner>
                    <Modal.Panel className="max-w-md">
                        <Modal.Header>
                            <div className="flex flex-col gap-0.5">
                                <Label.md>Share timeline</Label.md>
                                <Paragraph.xs className="text-tertiary truncate">
                                    {eventTitle}
                                </Paragraph.xs>
                            </div>
                        </Modal.Header>

                        <Modal.Content>
                            {loading ? (
                                <LoadingSpinner className="py-12" />
                            ) : share ? (
                                <div className="flex flex-col gap-5 p-4">
                                    <div className="flex flex-col gap-2">
                                        <Label.xs className="text-quaternary uppercase tracking-wide">
                                            Public link
                                        </Label.xs>
                                        <div className="flex items-center gap-2 rounded-lg border border-secondary bg-secondary_alt px-3 py-2">
                                            <Link2 className="size-4 text-tertiary shrink-0" />
                                            <input
                                                readOnly
                                                value={buildShareUrl(share.shareToken)}
                                                onFocus={(e) => e.currentTarget.select()}
                                                className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none truncate"
                                            />
                                            <Button.Icon
                                                aria-label="Copy link"
                                                variant="ghost"
                                                icon={copied ? <Check className="text-utility-green-700" /> : <Copy />}
                                                onClick={handleCopy}
                                            />
                                        </div>
                                        <Paragraph.xs className="text-tertiary">
                                            Anyone with this link can view the timeline read-only — no account required.
                                        </Paragraph.xs>
                                    </div>

                                    <div className="flex items-start gap-3 rounded-lg border border-secondary bg-secondary_alt p-3">
                                        <Radio className="size-4 mt-0.5 text-utility-green-700 shrink-0" />
                                        <div className="flex flex-1 flex-col gap-0.5">
                                            <Label.sm>Live playback sync</Label.sm>
                                            <Paragraph.xs className="text-tertiary">
                                                When on, your play / pause / seek is mirrored on every viewer in real time.
                                            </Paragraph.xs>
                                        </div>
                                        <Toggle
                                            on={share.liveSyncEnabled}
                                            disabled={busy}
                                            onChange={handleToggleLiveSync}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3 p-4">
                                    <Paragraph.sm className="text-secondary">
                                        Generate a link that lets anyone follow this event's timeline read-only — useful for
                                        remote stakeholders, run sheets shared with talent, or live monitoring on a second screen.
                                    </Paragraph.sm>
                                </div>
                            )}
                        </Modal.Content>

                        <Modal.Footer className="justify-between">
                            {share ? (
                                <Button
                                    variant="danger-secondary"
                                    icon={<Power />}
                                    onClick={handleRevoke}
                                    disabled={busy}
                                >
                                    Revoke link
                                </Button>
                            ) : <span />}
                            {share ? (
                                <Modal.Close>
                                    <Button variant="secondary">Done</Button>
                                </Modal.Close>
                            ) : (
                                <div className="flex gap-2">
                                    <Modal.Close>
                                        <Button variant="secondary">Cancel</Button>
                                    </Modal.Close>
                                    <Button onClick={handleCreate} disabled={busy}>
                                        {busy ? 'Creating...' : 'Create share link'}
                                    </Button>
                                </div>
                            )}
                        </Modal.Footer>
                    </Modal.Panel>
                </Modal.Positioner>
            </Modal.Portal>
        </Modal>
    )
}

function Toggle({ on, disabled, onChange }: { on: boolean; disabled?: boolean; onChange: (next: boolean) => void }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(!on)}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                on ? 'bg-utility-green-500' : 'bg-secondary'
            }`}
        >
            <span
                className={`inline-block size-4 transform rounded-full bg-white shadow transition-transform ${
                    on ? 'translate-x-4' : 'translate-x-0.5'
                }`}
            />
        </button>
    )
}
