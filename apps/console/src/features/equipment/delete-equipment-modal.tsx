import { Modal } from "@moc/ui/components/overlays/modal";
import { Button } from "@moc/ui/components/controls/button";
import { Label, Paragraph } from "@moc/ui/components/display/text";
import { TriangleAlert } from "lucide-react";

type DeleteEquipmentModalProps = {
  open: boolean;
  onDelete: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
};

export function DeleteEquipmentModal({ open, onDelete, onCancel, isDeleting = false }: DeleteEquipmentModalProps) {
  return (
    <Modal open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <Modal.Portal>
        <Modal.Backdrop />
        <Modal.Positioner>
          <Modal.Panel>
            <Modal.Header>
              <Label.md>Delete Equipment</Label.md>
            </Modal.Header>
            <Modal.Content className="p-4 flex-row gap-4">
              <TriangleAlert className="size-8 shrink-0 text-utility-red-600" />
              <Paragraph.sm className="text-secondary">
                Are you sure you want to delete this equipment? This action cannot be undone and all associated data will be permanently removed.
              </Paragraph.sm>
            </Modal.Content>
            <Modal.Footer className="justify-end">
              <Button variant="secondary" onClick={onCancel}>
                Cancel
              </Button>
              <Button variant="danger" onClick={onDelete} disabled={isDeleting}>
                {isDeleting ? "Deleting..." : "Delete Equipment"}
              </Button>
            </Modal.Footer>
          </Modal.Panel>
        </Modal.Positioner>
      </Modal.Portal>
    </Modal>
  );
}
