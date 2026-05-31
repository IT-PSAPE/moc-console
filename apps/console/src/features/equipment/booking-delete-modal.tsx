import { Button } from "@moc/ui/components/controls/button";
import { Paragraph, Title } from "@moc/ui/components/display/text";
import { Modal } from "@moc/ui/components/overlays/modal";

type BookingDeleteModalProps = {
  open: boolean;
  isDeleting: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
};

export function BookingDeleteModal({ open, isDeleting, onConfirm, onOpenChange }: BookingDeleteModalProps) {
  function handleCancel() {
    onOpenChange(false);
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <Modal.Portal>
        <Modal.Backdrop />
        <Modal.Positioner>
          <Modal.Panel>
            <Modal.Header>
              <Title.h6>Delete Booking</Title.h6>
            </Modal.Header>
            <Modal.Content className="p-4">
              <Paragraph.sm className="text-secondary">
                Are you sure you want to delete this booking? This action cannot be undone.
              </Paragraph.sm>
            </Modal.Content>
            <Modal.Footer className="justify-end">
              <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
              <Button variant="danger" onClick={onConfirm} disabled={isDeleting}>
                {isDeleting ? "Deleting..." : "Delete Booking"}
              </Button>
            </Modal.Footer>
          </Modal.Panel>
        </Modal.Positioner>
      </Modal.Portal>
    </Modal>
  );
}
