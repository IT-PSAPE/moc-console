import { AlertDialog as BaseAlertDialog } from '@base-ui/react/alert-dialog'
import { cn } from '@moc/utils/cn'
import { TriangleAlert } from 'lucide-react'
import { Button } from '../controls/button'
import { Label, Paragraph } from '../display/text'
import { useOverlayStack } from './overlay-provider'
import { OverlayContent, OverlayFooter, OverlayHeader } from './overlay-primitives'
import { Notification } from '../feedback/notification'

type ConfirmationDialogProps = {
    cancelLabel?: string
    confirmLabel: string
    description: string
    errorText?: string
    isConfirming?: boolean
    onConfirm: () => void
    onOpenChange: (open: boolean) => void
    open: boolean
    title: string
}

export function ConfirmationDialog({ cancelLabel = 'Cancel', confirmLabel, description, errorText, isConfirming = false, onConfirm, onOpenChange, open, title }: ConfirmationDialogProps) {
    const { state: overlayState } = useOverlayStack()

    return (
        <BaseAlertDialog.Root open={open} onOpenChange={onOpenChange}>
            <BaseAlertDialog.Portal container={overlayState.rootElement ?? undefined}>
                <BaseAlertDialog.Backdrop className="pointer-events-auto fixed inset-0 z-[9100] bg-overlay/50 backdrop-blur-[2px] transition-opacity duration-200 motion-reduce:transition-none data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
                <BaseAlertDialog.Viewport className="pointer-events-none fixed inset-0 z-[9100] flex items-center justify-center overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
                    <BaseAlertDialog.Popup className={cn(
                        'pointer-events-auto flex w-full max-w-md flex-col rounded-xl border border-secondary bg-primary shadow-xl outline-none',
                        'origin-center transition-[opacity,transform] duration-200 motion-reduce:transition-none',
                        'data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0',
                    )}>
                        <OverlayHeader>
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-error text-error">
                                <TriangleAlert className="size-5" aria-hidden="true" />
                            </span>
                            <BaseAlertDialog.Title render={<Label.md className="min-w-0 flex-1 text-pretty text-primary" />}>
                                {title}
                            </BaseAlertDialog.Title>
                        </OverlayHeader>
                        <OverlayContent className="gap-1">
                            <BaseAlertDialog.Description render={<Paragraph.sm className="text-pretty text-tertiary" />}>
                                {description}
                            </BaseAlertDialog.Description>
                            {open && errorText ? <Notification variant="error" title="Couldn't complete action" description={errorText} /> : null}
                        </OverlayContent>
                        <OverlayFooter>
                            <BaseAlertDialog.Close nativeButton render={<Button variant="secondary" disabled={isConfirming} />}>
                                {cancelLabel}
                            </BaseAlertDialog.Close>
                            <Button variant="danger" onClick={onConfirm} disabled={isConfirming}>
                                {isConfirming ? 'Working…' : confirmLabel}
                            </Button>
                        </OverlayFooter>
                    </BaseAlertDialog.Popup>
                </BaseAlertDialog.Viewport>
            </BaseAlertDialog.Portal>
        </BaseAlertDialog.Root>
    )
}
