import { ConfirmationDialog } from '@moc/ui/components/overlays/confirmation-dialog'

type DeleteRequestModalProps = {
    open: boolean
    onDelete: () => void
    onCancel: () => void
    isDeleting?: boolean
}

export function DeleteRequestModal({ open, onDelete, onCancel, isDeleting = false }: DeleteRequestModalProps) {
    function handleOpenChange(nextOpen: boolean) {
        if (!nextOpen) onCancel()
    }

    return (
        <ConfirmationDialog
            open={open}
            onOpenChange={handleOpenChange}
            title="Delete request?"
            description="This permanently deletes the request and its associated data. This action cannot be undone."
            confirmLabel="Delete request"
            isConfirming={isDeleting}
            onConfirm={onDelete}
        />
    )
}
