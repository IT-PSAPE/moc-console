import { ConfirmationDialog } from "@moc/ui/components/overlays/confirmation-dialog";

type DeleteEquipmentModalProps = {
  open: boolean;
  onDelete: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
};

export function DeleteEquipmentModal({ open, onDelete, onCancel, isDeleting = false }: DeleteEquipmentModalProps) {
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) onCancel();
  }

  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Delete equipment?"
      description="This permanently deletes the equipment and its associated data. This action cannot be undone."
      confirmLabel="Delete equipment"
      isConfirming={isDeleting}
      onConfirm={onDelete}
    />
  );
}
