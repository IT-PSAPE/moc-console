import { AlertDialog as BaseAlertDialog } from '@base-ui/react/alert-dialog'
import { cn } from '@moc/utils/cn'
import { TriangleAlert } from 'lucide-react'
import { Button } from '../controls/button'
import { useOverlayStack } from './overlay-provider'

type ConfirmationDialogProps = {
    cancelLabel?: string
    confirmLabel: string
    description: string
    isConfirming?: boolean
    onConfirm: () => void
    onOpenChange: (open: boolean) => void
    open: boolean
    title: string
}

export function ConfirmationDialog({ cancelLabel = 'Cancel', confirmLabel, description, isConfirming = false, onConfirm, onOpenChange, open, title }: ConfirmationDialogProps) {
    const { state: overlayState } = useOverlayStack()

    return (
        <BaseAlertDialog.Root open={open} onOpenChange={onOpenChange}>
            <BaseAlertDialog.Portal container={overlayState.rootElement ?? undefined}>
                <BaseAlertDialog.Backdrop className="fixed inset-0 z-[9100] bg-black/40 transition-opacity duration-200 motion-reduce:transition-none data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
                <BaseAlertDialog.Viewport className="fixed inset-0 z-[9100] flex items-center justify-center overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
                    <BaseAlertDialog.Popup className={cn(
                        'w-full max-w-md rounded-xl border border-secondary bg-primary p-4 shadow-xl outline-none',
                        'origin-center transition-[opacity,transform] duration-200 motion-reduce:transition-none',
                        'data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0',
                    )}>
                        <div className="flex items-start gap-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-error-primary text-error">
                                <TriangleAlert className="size-5" aria-hidden="true" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <BaseAlertDialog.Title className="label-md text-pretty text-primary">
                                    {title}
                                </BaseAlertDialog.Title>
                                <BaseAlertDialog.Description className="paragraph-sm pt-1.5 text-pretty text-secondary">
                                    {description}
                                </BaseAlertDialog.Description>
                            </div>
                        </div>
                        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <BaseAlertDialog.Close nativeButton render={<Button variant="secondary" disabled={isConfirming} />}>
                                {cancelLabel}
                            </BaseAlertDialog.Close>
                            <Button variant="danger" onClick={onConfirm} disabled={isConfirming}>
                                {isConfirming ? 'Working…' : confirmLabel}
                            </Button>
                        </div>
                    </BaseAlertDialog.Popup>
                </BaseAlertDialog.Viewport>
            </BaseAlertDialog.Portal>
        </BaseAlertDialog.Root>
    )
}
