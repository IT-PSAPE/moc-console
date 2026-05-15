import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@moc/ui/components/overlays/modal";
import { Button } from "@moc/ui/components/controls/button";
import { Input } from "@moc/ui/components/form/input";
import { FormLabel } from "@moc/ui/components/form/form-label";
import { Label } from "@moc/ui/components/display/text";
import type { Equipment } from "@moc/types/equipment";
import type { CreateBookingParams } from "@/data/mutate-booking";
import { formatUtcIsoForBrowserDateTimeInput, parseBrowserDateTimeInputToUtcIso } from "@moc/utils/browser-date-time";

type CreateBookingModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: Equipment[];
  onCreate: (params: CreateBookingParams) => Promise<void> | void;
};

function getDefaultExpectedReturnValue(checkedOutDate: string) {
  const nextDate = new Date(checkedOutDate);
  nextDate.setHours(nextDate.getHours() + 24);
  return nextDate.toISOString();
}

export function CreateBookingModal({ open, onOpenChange, equipment, onCreate }: CreateBookingModalProps) {
  const availableEquipment = useMemo(
    () => equipment.filter((item) => item.status !== "maintenance"),
    [equipment],
  );
  const defaultEquipment = availableEquipment[0] ?? null;
  const defaultCheckedOutDate = new Date().toISOString();

  const [equipmentId, setEquipmentId] = useState(defaultEquipment?.id ?? "");
  const [bookedBy, setBookedBy] = useState("");
  const [checkedOutDate, setCheckedOutDate] = useState(formatUtcIsoForBrowserDateTimeInput(defaultCheckedOutDate));
  const [expectedReturnAt, setExpectedReturnAt] = useState(
    formatUtcIsoForBrowserDateTimeInput(getDefaultExpectedReturnValue(defaultCheckedOutDate)),
  );
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    const nextCheckedOutDate = new Date().toISOString();
    setEquipmentId(defaultEquipment?.id ?? "");
    setBookedBy("");
    setCheckedOutDate(formatUtcIsoForBrowserDateTimeInput(nextCheckedOutDate));
    setExpectedReturnAt(formatUtcIsoForBrowserDateTimeInput(getDefaultExpectedReturnValue(nextCheckedOutDate)));
    setNotes("");
  }, [defaultEquipment]);

  useEffect(() => {
    if (!open) {
      return;
    }

    resetForm();
  }, [open, resetForm]);

  const canSubmit = equipmentId.length > 0 && bookedBy.trim().length > 0 && checkedOutDate.length > 0 && expectedReturnAt.length > 0 && !isSubmitting;

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      resetForm();
    }
  }, [onOpenChange, resetForm]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) {
      return;
    }

    const selectedEquipment = availableEquipment.find((item) => item.id === equipmentId);
    if (!selectedEquipment) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreate({
        equipmentId: selectedEquipment.id,
        equipmentName: selectedEquipment.name,
        bookedBy: bookedBy.trim(),
        checkedOutDate: parseBrowserDateTimeInputToUtcIso(checkedOutDate),
        expectedReturnAt: parseBrowserDateTimeInputToUtcIso(expectedReturnAt),
        notes: notes.trim(),
        status: "booked",
      });
      onOpenChange(false);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  }, [availableEquipment, bookedBy, canSubmit, checkedOutDate, equipmentId, expectedReturnAt, notes, onCreate, onOpenChange, resetForm]);

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <Modal.Portal>
        <Modal.Backdrop />
        <Modal.Positioner>
          <Modal.Panel className="w-full max-w-md">
            <Modal.Header>
              <Label.md>New Booking</Label.md>
            </Modal.Header>
            <Modal.Content>
              <div className="flex flex-col gap-4 p-4">
                <div className="flex flex-col gap-1.5">
                  <FormLabel label="Equipment" required />
                  <select
                    value={equipmentId}
                    onChange={(event) => setEquipmentId(event.target.value)}
                    className="w-full rounded-md border border-secondary bg-primary px-3 py-2 text-sm text-primary focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  >
                    {availableEquipment.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <FormLabel label="Booked By" required />
                  <Input value={bookedBy} onChange={(event) => setBookedBy(event.target.value)} placeholder="Name" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <FormLabel label="Checked Out" required />
                  <Input type="datetime-local" value={checkedOutDate} onChange={(event) => setCheckedOutDate(event.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <FormLabel label="Expected Return" required />
                  <Input type="datetime-local" value={expectedReturnAt} onChange={(event) => setExpectedReturnAt(event.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <FormLabel label="Notes" optional />
                  <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notes" />
                </div>
              </div>
            </Modal.Content>
            <Modal.Footer>
              <Button onClick={handleSubmit} disabled={!canSubmit}>
                {isSubmitting ? "Creating..." : "Create Booking"}
              </Button>
              <Modal.Close>
                <Button variant="secondary">Cancel</Button>
              </Modal.Close>
            </Modal.Footer>
          </Modal.Panel>
        </Modal.Positioner>
      </Modal.Portal>
    </Modal>
  );
}
