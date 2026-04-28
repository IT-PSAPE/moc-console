import { Drawer, useDrawer } from "@/components/overlays/drawer";
import { Dropdown } from "@/components/overlays/dropdown";
import { Badge } from "@/components/display/badge";
import { Button } from "@/components/controls/button";
import { Paragraph, Title } from "@/components/display/text";
import { MetaRow } from "@/components/display/meta-row";
import { Input } from "@/components/form/input";
import { Modal } from "@/components/overlays/modal";
import { UnsavedChangesModal } from "@/features/requests/unsaved-changes-modal";
import { useBookingStore } from "./use-booking-store";
import { useEquipment } from "./equipment-provider";
import { useFeedback } from "@/components/feedback/feedback-provider";
import { fetchEquipmentById } from "@/data/fetch-equipment";
import { deleteBooking } from "@/data/mutate-booking";
import {
  bookingStatusLabel,
  bookingStatusColor,
} from "@/types/equipment";
import type { Booking, BookingStatus } from "@/types/equipment";
import { Calendar, Check, Clock, Loader, Package, StickyNote, Trash2, User, X } from "lucide-react";
import { useCallback, useEffect, useState, type RefObject } from "react";
import { getErrorMessage } from "@/utils/get-error-message";
import { formatUtcIsoForBrowserDateTimeInput, parseBrowserDateTimeInputToUtcIso } from "@/utils/browser-date-time";

const allStatuses: BookingStatus[] = ["booked", "checked_out", "returned"];

export type BookingDrawerProps = {
  booking: Booking;
  onBookingClose?: () => void;
  isDirtyRef?: RefObject<boolean>;
  requestCloseRef?: RefObject<(() => void) | null>;
};

export function BookingDrawer({ booking, onBookingClose, isDirtyRef, requestCloseRef }: BookingDrawerProps) {
  return (
    <Drawer.Portal>
      <Drawer.Backdrop />
      <Drawer.Panel className="!max-w-lg">
        <BookingDrawerContent
          booking={booking}
          onBookingClose={onBookingClose}
          isDirtyRef={isDirtyRef}
          requestCloseRef={requestCloseRef}
        />
      </Drawer.Panel>
    </Drawer.Portal>
  );
}

function BookingDrawerContent({ booking, onBookingClose, isDirtyRef, requestCloseRef }: BookingDrawerProps) {
    const { actions: drawerActions } = useDrawer();
    const { toast } = useFeedback();
    const { actions: { syncBooking, syncEquipment, removeBooking } } = useEquipment();

    const [showUnsavedModal, setShowUnsavedModal] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

  const store = useBookingStore(booking, { syncBooking });

  useEffect(() => {
    if (isDirtyRef) isDirtyRef.current = store.state.isDirty;
  }, [isDirtyRef, store.state.isDirty]);

  useEffect(() => {
    if (requestCloseRef) {
      requestCloseRef.current = () => setShowUnsavedModal(true);
    }
    return () => {
      if (requestCloseRef) requestCloseRef.current = null;
    };
  }, [requestCloseRef]);

  const closeDrawer = useCallback(() => {
    if (onBookingClose) {
      onBookingClose();
      return;
    }
    drawerActions.close();
  }, [onBookingClose, drawerActions]);

  const handleClose = useCallback(() => {
    if (store.state.isDirty) {
      setShowUnsavedModal(true);
      return;
    }
    closeDrawer();
  }, [store.state.isDirty, closeDrawer]);

  const handleSave = useCallback(async () => {
    try {
      const savedBooking = await store.actions.save();
      const refreshedEquipment = await fetchEquipmentById(savedBooking.equipmentId);
      if (refreshedEquipment) {
        syncEquipment(refreshedEquipment);
      }
      toast({ title: "Booking saved", variant: "success" });
    } catch (error) {
      toast({ title: "Failed to save booking", description: getErrorMessage(error, "The booking could not be saved."), variant: "error" });
    }
  }, [store.actions, syncEquipment, toast]);

  async function handleModalSave() {
    try {
      const savedBooking = await store.actions.save();
      const refreshedEquipment = await fetchEquipmentById(savedBooking.equipmentId);
      if (refreshedEquipment) {
        syncEquipment(refreshedEquipment);
      }
      toast({ title: "Booking saved", variant: "success" });
      setShowUnsavedModal(false);
      closeDrawer();
    } catch (error) {
      toast({ title: "Failed to save booking", description: getErrorMessage(error, "The booking could not be saved."), variant: "error" });
    }
  }

  function handleModalDiscard() {
    store.actions.discard();
    setShowUnsavedModal(false);
    closeDrawer();
  }

  function handleModalCancel() {
    setShowUnsavedModal(false);
  }

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      await deleteBooking(booking.id);
      removeBooking(booking.id);
      const refreshedEquipment = await fetchEquipmentById(booking.equipmentId);
      if (refreshedEquipment) {
        syncEquipment(refreshedEquipment);
      }
      toast({ title: "Booking deleted", variant: "success" });
      setDeleteOpen(false);
      closeDrawer();
    } catch (error) {
      toast({ title: "Failed to delete booking", description: getErrorMessage(error, "The booking could not be deleted."), variant: "error" });
    } finally {
      setIsDeleting(false);
    }
  }, [booking.equipmentId, booking.id, closeDrawer, removeBooking, syncEquipment, toast]);

  const draft = store.state.draft;

  return (
    <>
      <Drawer.Header className="flex items-center gap-1">
        <Button.Icon variant="ghost" icon={<X />} onClick={handleClose} />
        <div className="flex-1" />
        <Button.Icon variant="danger-secondary" icon={<Trash2 />} onClick={() => setDeleteOpen(true)} />
      </Drawer.Header>

      <Drawer.Content className="py-4">
        {/* Equipment reference */}
        <div className="flex items-center gap-3 px-4 pb-4">
          <span className="flex size-12 items-center justify-center rounded-lg bg-secondary text-quaternary">
            <Package className="size-6" />
          </span>
          <div>
            <Title.h6>{draft.equipmentName}</Title.h6>
            <Paragraph.xs className="text-tertiary">Booking</Paragraph.xs>
          </div>
        </div>

        {/* Properties */}
        <div className="px-4 space-y-3">
          {/* Status */}
          <MetaRow icon={<Loader />} label="Status">
            <Dropdown.Root placement="bottom">
              <Dropdown.Trigger>
                <Badge
                  label={bookingStatusLabel[draft.status]}
                  color={bookingStatusColor[draft.status]}
                  className="cursor-pointer"
                />
              </Dropdown.Trigger>
              <Dropdown.Panel>
                {allStatuses.map((s) => (
                  <Dropdown.Item key={s} onSelect={() => {
                    store.actions.updateField("status", s);
                    if (s === "returned" && !draft.returnedDate) {
                      store.actions.updateField("returnedDate", new Date().toISOString());
                    }
                  }}>
                    <span className="size-4 shrink-0 flex items-center justify-center">
                      {s === draft.status && <Check className="size-3.5 text-brand_secondary" />}
                    </span>
                    {bookingStatusLabel[s]}
                  </Dropdown.Item>
                ))}
              </Dropdown.Panel>
            </Dropdown.Root>
          </MetaRow>

          {/* Booked By */}
          <MetaRow icon={<User />} label="Booked By">
            <Input
              type="text"
              value={draft.bookedBy}
              onChange={(e) => store.actions.updateField("bookedBy", e.target.value)}
              placeholder="Enter name"
              style="ghost"
            />
          </MetaRow>

          {/* Checked Out */}
          <MetaRow icon={<Calendar />} label="Checked Out">
            <Input
              type="datetime-local"
              value={formatUtcIsoForBrowserDateTimeInput(draft.checkedOutDate)}
              onChange={(e) => store.actions.updateField("checkedOutDate", parseBrowserDateTimeInputToUtcIso(e.target.value))}
              style="ghost"
            />
          </MetaRow>

          {/* Expected Return */}
          <MetaRow icon={<Clock />} label="Expected Return">
            <Input
              type="datetime-local"
              value={formatUtcIsoForBrowserDateTimeInput(draft.expectedReturnAt)}
              onChange={(e) => store.actions.updateField("expectedReturnAt", parseBrowserDateTimeInputToUtcIso(e.target.value))}
              style="ghost"
            />
          </MetaRow>

          {/* Returned */}
          <MetaRow icon={<Calendar />} label="Returned">
            <Input
              type="datetime-local"
              value={draft.returnedDate ? formatUtcIsoForBrowserDateTimeInput(draft.returnedDate) : ""}
              onChange={(e) => store.actions.updateField("returnedDate", e.target.value ? parseBrowserDateTimeInputToUtcIso(e.target.value) : null)}
              style="ghost"
            />
          </MetaRow>

          {/* Duration — read-only */}
          <MetaRow icon={<Clock />} label="Duration">
            <Paragraph.sm>{draft.duration}</Paragraph.sm>
          </MetaRow>

          {/* Notes */}
          <MetaRow icon={<StickyNote />} label="Notes">
            <Input
              type="text"
              value={draft.notes}
              onChange={(e) => store.actions.updateField("notes", e.target.value)}
              placeholder="Add notes..."
              style="ghost"
            />
          </MetaRow>
        </div>
      </Drawer.Content>

      {store.state.isDirty && (
        <Drawer.Footer className="justify-end">
          <Button variant="ghost" onClick={store.actions.discard}>Discard</Button>
          <Button onClick={handleSave} disabled={store.state.isSaving}>
            {store.state.isSaving ? "Saving..." : "Save"}
          </Button>
        </Drawer.Footer>
      )}

      <UnsavedChangesModal
        open={showUnsavedModal}
        onSave={handleModalSave}
        onDiscard={handleModalDiscard}
        onCancel={handleModalCancel}
        isSaving={store.state.isSaving}
      />

      <Modal.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
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
                <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                <Button variant="danger" onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? "Deleting..." : "Delete Booking"}
                </Button>
              </Modal.Footer>
            </Modal.Panel>
          </Modal.Positioner>
        </Modal.Portal>
      </Modal.Root>
    </>
  );
}
