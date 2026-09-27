import { ConfirmationDialog } from "@moc/ui/components/overlays/confirmation-dialog";

type VenueBookingRejectModalProps = {
    open: boolean;
    isRejecting: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
};

export function VenueBookingRejectModal({ open, isRejecting, onOpenChange, onConfirm }: VenueBookingRejectModalProps) {
    return (
        <ConfirmationDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Reject booking?"
            description="This tells the requester their venue booking was not approved and releases its slot."
            confirmLabel="Reject booking"
            isConfirming={isRejecting}
            onConfirm={onConfirm}
        />
    );
}
