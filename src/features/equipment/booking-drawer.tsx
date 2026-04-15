import { Drawer, useDrawer } from "@/components/overlays/drawer";
import { Dropdown } from "@/components/overlays/dropdown";
import { Badge } from "@/components/display/badge";
import { Button } from "@/components/controls/button";
import { Paragraph, Title } from "@/components/display/text";
import { MetaRow } from "@/components/display/meta-row";
import { Input } from "@/components/form/input";
import { UnsavedChangesModal } from "@/features/requests/unsaved-changes-modal";
import { useBookingStore } from "./use-booking-store";
import { useEquipment } from "./equipment-provider";
import { useFeedback } from "@/components/feedback/feedback-provider";
import {
  bookingStatusLabel,
  bookingStatusColor,
} from "@/types/equipment";
import type { Booking, BookingStatus } from "@/types/equipment";
import { Calendar, Check, Clock, Loader, Package, StickyNote, User, X } from "lucide-react";
import { useCallback, useEffect, useState, type RefObject } from "react";
import { getErrorMessage } from "@/utils/get-error-message";

const allStatuses: BookingStatus[] = ["booked", "checked_out", "returned"];

function toLocalDateTimeValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
  const { actions: { syncBooking } } = useEquipment();

  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

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
      await store.actions.save();
      toast({ title: "Booking saved", variant: "success" });
    } catch (error) {
      toast({ title: "Failed to save booking", description: getErrorMessage(error, "The booking could not be saved."), variant: "error" });
    }
  }, [store.actions, toast]);

  async function handleModalSave() {
    try {
      await store.actions.save();
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

  const draft = store.state.draft;

  return (
    <>
      <Drawer.Header className="flex items-center gap-1">
        <Button.Icon variant="ghost" icon={<X />} onClick={handleClose} />
        <div className="flex-1" />
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
              value={toLocalDateTimeValue(draft.checkedOutDate)}
              onChange={(e) => store.actions.updateField("checkedOutDate", new Date(e.target.value).toISOString())}
              style="ghost"
            />
          </MetaRow>

          {/* Expected Return */}
          <MetaRow icon={<Clock />} label="Expected Return">
            <Input
              type="datetime-local"
              value={toLocalDateTimeValue(draft.expectedReturnAt)}
              onChange={(e) => store.actions.updateField("expectedReturnAt", new Date(e.target.value).toISOString())}
              style="ghost"
            />
          </MetaRow>

          {/* Returned */}
          <MetaRow icon={<Calendar />} label="Returned">
            <Input
              type="datetime-local"
              value={draft.returnedDate ? toLocalDateTimeValue(draft.returnedDate) : ""}
              onChange={(e) => store.actions.updateField("returnedDate", e.target.value ? new Date(e.target.value).toISOString() : null)}
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
    </>
  );
}
