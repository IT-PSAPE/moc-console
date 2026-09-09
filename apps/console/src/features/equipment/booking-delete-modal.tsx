import { ConfirmationDialog } from "@moc/ui/components/overlays/confirmation-dialog";

type BookingDeleteModalProps = {
  open: boolean;
  isDeleting: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
};

export function BookingDeleteModal({ open, isDeleting, onConfirm, onOpenChange }: BookingDeleteModalProps) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete booking?"
      description="This permanently deletes the booking and cannot be undone."
      confirmLabel="Delete booking"
      isConfirming={isDeleting}
      onConfirm={onConfirm}
    />
  );
}
