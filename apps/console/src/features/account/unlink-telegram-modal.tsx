import { ConfirmationDialog } from '@moc/ui/components/overlays/confirmation-dialog'

type UnlinkTelegramModalProps = {
    open: boolean
    onConfirm: () => void
    onCancel: () => void
    isUnlinking?: boolean
}

export function UnlinkTelegramModal({ open, onConfirm, onCancel, isUnlinking = false }: UnlinkTelegramModalProps) {
    function handleOpenChange(nextOpen: boolean) {
        if (!nextOpen) onCancel()
    }

    return (
        <ConfirmationDialog
            open={open}
            onOpenChange={handleOpenChange}
            title="Disconnect Telegram"
            description="You'll stop receiving MOC Console notifications in Telegram. You can reconnect anytime from Edit profile."
            confirmLabel="Yes, disconnect"
            isConfirming={isUnlinking}
            onConfirm={onConfirm}
        />
    )
}
