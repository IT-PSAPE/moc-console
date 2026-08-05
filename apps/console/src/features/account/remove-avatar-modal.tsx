import { ConfirmationDialog } from '@moc/ui/components/overlays/confirmation-dialog'

type RemoveAvatarModalProps = {
    open: boolean
    onConfirm: () => void
    onCancel: () => void
    isRemoving?: boolean
}

export function RemoveAvatarModal({ open, onConfirm, onCancel, isRemoving = false }: RemoveAvatarModalProps) {
    function handleOpenChange(nextOpen: boolean) {
        if (!nextOpen) onCancel()
    }

    return (
        <ConfirmationDialog
            open={open}
            onOpenChange={handleOpenChange}
            title="Remove profile photo?"
            description="Your initials will be shown instead. You can upload a new photo at any time."
            confirmLabel="Remove photo"
            isConfirming={isRemoving}
            onConfirm={onConfirm}
        />
    )
}
