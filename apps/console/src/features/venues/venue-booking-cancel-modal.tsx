import { useState, type ChangeEvent } from "react";
import { Button } from "@moc/ui/components/controls/button";
import { Label } from "@moc/ui/components/display/text";
import { TextArea } from "@moc/ui/components/form/text-area";
import { Modal } from "@moc/ui/components/overlays/modal";

type VenueBookingCancelModalProps = {
    open: boolean;
    onCancel: () => void;
    onConfirm: (reason: string) => void;
    isCancelling?: boolean;
};

export function VenueBookingCancelModal({ open, onCancel, onConfirm, isCancelling = false }: VenueBookingCancelModalProps) {
    const [reason, setReason] = useState("");
    const [wasOpen, setWasOpen] = useState(open);

    // Adjusting state during render (not in an effect) so the reason clears
    // the moment the modal closes, without a render-then-cascade round trip.
    if (open !== wasOpen) {
        setWasOpen(open);
        if (!open) setReason("");
    }

    function handleOpenChange(nextOpen: boolean) {
        if (!nextOpen) onCancel();
    }

    function handleReasonChange(event: ChangeEvent<HTMLTextAreaElement>) {
        setReason(event.target.value);
    }

    function handleConfirm() {
        onConfirm(reason.trim());
    }

    const canSubmit = reason.trim().length > 0 && !isCancelling;

    return (
        <Modal open={open} onOpenChange={handleOpenChange}>
            <Modal.Portal>
                <Modal.Backdrop />
                <Modal.Positioner>
                    <Modal.Panel>
                        <Modal.Header><Label.md>Cancel booking?</Label.md></Modal.Header>
                        <Modal.Content className="p-4">
                            <TextArea
                                aria-label="Cancellation reason"
                                autoComplete="off"
                                name="cancel-reason"
                                rows={4}
                                placeholder="Why is this booking being cancelled?"
                                value={reason}
                                onChange={handleReasonChange}
                            />
                        </Modal.Content>
                        <Modal.Footer className="justify-end">
                            <Button variant="secondary" onClick={onCancel} disabled={isCancelling}>Keep booking</Button>
                            <Button variant="danger" onClick={handleConfirm} disabled={!canSubmit}>{isCancelling ? "Cancelling…" : "Cancel booking"}</Button>
                        </Modal.Footer>
                    </Modal.Panel>
                </Modal.Positioner>
            </Modal.Portal>
        </Modal>
    );
}
