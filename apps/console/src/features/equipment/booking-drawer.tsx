import { Drawer, useDrawer } from "@moc/ui/components/overlays/drawer";
import { Button } from "@moc/ui/components/controls/button";
import { Paragraph, Title } from "@moc/ui/components/display/text";
import { MetaRow } from "@moc/ui/components/display/meta-row";
import { Input } from "@moc/ui/components/form/input";
import { DateTimeFields } from "@moc/ui/components/form/date-time-fields";
import { TextArea } from "@moc/ui/components/form/text-area";
import { UnsavedChangesModal } from "@/features/requests/unsaved-changes-modal";
import { useBookingStore } from "./use-booking-store";
import { useEquipment } from "./equipment-provider";
import { BookingItemsSection } from "./booking-items-section";
import { BookingDeleteModal } from "./booking-delete-modal";
import { BookingScanModal } from "./booking-scan-modal";
import { BookingStatusDropdown } from "./booking-status-dropdown";
import { useBookingCollection } from "./use-booking-collection";
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider";
import { deleteBooking } from "@/data/mutate-booking";
import type { Booking, BookingStatus } from "@moc/types/equipment";
import { Calendar, Clock, Loader, Maximize2, Package, ScanLine, StickyNote, Trash2, User, X } from "lucide-react";
import { useCallback, useEffect, useState, type ChangeEvent, type RefObject } from "react";
import { useNavigate } from "react-router-dom";
import { getErrorMessage } from "@moc/utils/get-error-message";
import { formatUtcIsoForBrowserDateTimeInput, parseBrowserDateTimeInputToUtcIso } from "@moc/utils/browser-date-time";

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
      <Drawer.Panel className="max-w-lg">
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
    const navigate = useNavigate();
    const { toast } = useFeedback();
    const { actions: { syncBooking, refreshEquipment, removeBooking } } = useEquipment();

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

  function handleOpenFullPage() {
    if (store.state.isDirty) {
      setShowUnsavedModal(true);
      return;
    }
    closeDrawer();
    navigate(`/equipment/bookings/${booking.id}`);
  }

  const persistBooking = useCallback(async () => {
    try {
      await store.actions.save();
      // A booking can hold multiple items, so a per-equipment-id sync
      // can't refresh them all in one call. Refetch the whole inventory.
      await refreshEquipment();
      toast({ title: "Booking saved", variant: "success" });
    } catch (error) {
      toast({ title: "Failed to save booking", description: getErrorMessage(error, "The booking could not be saved."), variant: "error" });
    }
  }, [store.actions, refreshEquipment, toast]);

  const collection = useBookingCollection({
    booking: store.state.draft,
    onItemCollected: (item) => {
      toast({ title: "Item collected", description: item.equipmentName, variant: "success" });
    },
    onItemAlreadyCollected: (item) => {
      toast({ title: "Already collected", description: `${item.equipmentName} was already scanned.`, variant: "error" });
    },
    onUnknownCode: () => {
      toast({ title: "Item not in booking", description: "That QR code does not match any equipment in this booking.", variant: "error" });
    },
  });

  const handleSave = useCallback(async () => {
    await persistBooking();
  }, [persistBooking]);

  async function handleModalSave() {
    try {
      await store.actions.save();
      await refreshEquipment();
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
      await refreshEquipment();
      toast({ title: "Booking deleted", variant: "success" });
      setDeleteOpen(false);
      closeDrawer();
    } catch (error) {
      toast({ title: "Failed to delete booking", description: getErrorMessage(error, "The booking could not be deleted."), variant: "error" });
    } finally {
      setIsDeleting(false);
    }
  }, [booking.id, closeDrawer, refreshEquipment, removeBooking, toast]);

  function handleSelectStatus(status: BookingStatus) {
    const previousStatus = store.state.draft.status;
    store.actions.updateField("status", status);
    // Setting the booking to checked_out is the act of collection, so stamp the
    // actual handover moment onto checked_out_at — mirrors how returned fills
    // returnedDate. Guarded on the transition so re-saving doesn't move it.
    if (status === "checked_out" && previousStatus !== "checked_out") {
      store.actions.updateField("checkedOutDate", new Date().toISOString());
    }
    if (status === "returned" && !store.state.draft.returnedDate) {
      store.actions.updateField("returnedDate", new Date().toISOString());
    }
  }

  function handleBookedByChange(event: ChangeEvent<HTMLInputElement>) {
    store.actions.updateField("bookedBy", event.target.value);
  }

  function handleCheckedOutDateChange(value: string) {
    store.actions.updateField(
      "checkedOutDate",
      value ? parseBrowserDateTimeInputToUtcIso(value) : "",
    );
  }

  function handleExpectedReturnChange(value: string) {
    store.actions.updateField(
      "expectedReturnAt",
      value ? parseBrowserDateTimeInputToUtcIso(value) : "",
    );
  }

  function handleReturnedDateChange(value: string) {
    store.actions.updateField(
      "returnedDate",
      value
        ? parseBrowserDateTimeInputToUtcIso(value)
        : null,
    );
  }

  function handleNotesChange(event: ChangeEvent<HTMLTextAreaElement>) {
    store.actions.updateField("notes", event.target.value);
  }

  function handleDeleteRequest() {
    setDeleteOpen(true);
  }

  function handleDeleteOpenChange(open: boolean) {
    setDeleteOpen(open);
  }

  const draft = store.state.draft;

  return (
    <>
      <Drawer.Header className="flex items-center gap-1">
        <Button.Icon variant="ghost" icon={<X />} onClick={handleClose} />
        <div className="flex-1" />
        <Button.Icon
          variant="secondary"
          aria-label={collection.state.isComplete ? "All items scanned" : "Scan booking items"}
          disabled={!collection.state.canScan}
          icon={<ScanLine />}
          onClick={collection.actions.openScanner}
        />
        <Button.Icon variant="ghost" icon={<Maximize2 />} onClick={handleOpenFullPage} aria-label="Open full page" />
        <Button.Icon variant="danger-secondary" icon={<Trash2 />} onClick={handleDeleteRequest} />
      </Drawer.Header>

      <Drawer.Content className="py-4">
        {/* Header — title is owned by the requester, so display only. */}
        <div className="flex items-center gap-3 px-4 pb-4">
          <span className="flex size-12 items-center justify-center rounded-lg bg-secondary text-quaternary">
            <Package className="size-6" />
          </span>
          <div className="min-w-0">
            <Title.h6 className="truncate">{draft.title}</Title.h6>
            <Paragraph.xs className="text-tertiary">Booking</Paragraph.xs>
          </div>
        </div>

        {/* Properties */}
        <div className="px-4 space-y-3">
          {/* Status */}
          <MetaRow icon={<Loader />} label="Status">
            <BookingStatusDropdown status={draft.status} onSelectStatus={handleSelectStatus} />
          </MetaRow>

          {/* Booked By */}
          <MetaRow icon={<User />} label="Booked By">
            <Input
              type="text"
              value={draft.bookedBy}
              onChange={handleBookedByChange}
              placeholder="Enter name"
              style="ghost"
            />
          </MetaRow>

          {/* Checked Out */}
          <MetaRow icon={<Calendar />} label="Checked Out">
            <DateTimeFields
              value={formatUtcIsoForBrowserDateTimeInput(draft.checkedOutDate)}
              onChange={handleCheckedOutDateChange}
              style="ghost"
              required
              fieldsClassName="sm:grid-cols-2"
            />
          </MetaRow>

          {/* Expected Return */}
          <MetaRow icon={<Clock />} label="Expected Return">
            <DateTimeFields
              value={formatUtcIsoForBrowserDateTimeInput(draft.expectedReturnAt)}
              onChange={handleExpectedReturnChange}
              style="ghost"
              required
              fieldsClassName="sm:grid-cols-2"
            />
          </MetaRow>

          {/* Returned */}
          <MetaRow icon={<Calendar />} label="Returned">
            <DateTimeFields
              value={draft.returnedDate ? formatUtcIsoForBrowserDateTimeInput(draft.returnedDate) : ""}
              onChange={handleReturnedDateChange}
              style="ghost"
              fieldsClassName="sm:grid-cols-2"
            />
          </MetaRow>

          {/* Duration — read-only */}
          <MetaRow icon={<Clock />} label="Duration">
            <Paragraph.sm>{draft.duration}</Paragraph.sm>
          </MetaRow>

          {/* Notes */}
          <MetaRow icon={<StickyNote />} label="Notes">
            <TextArea
              value={draft.notes}
              onChange={handleNotesChange}
              placeholder="Add notes..."
              style="ghost"
              resize="vertical"
              rows={5}
              className="w-full whitespace-pre-wrap"
            />
          </MetaRow>
        </div>

        {/* Items */}
        <BookingItemsSection items={draft.items} scannedItemIds={collection.state.scannedItemIds} onNavigate={closeDrawer} />
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

      <BookingDeleteModal open={deleteOpen} isDeleting={isDeleting} onConfirm={handleDelete} onOpenChange={handleDeleteOpenChange} />
      <BookingScanModal
        open={collection.state.isOpen}
        isStarting={collection.state.isStarting}
        isSupported={collection.state.isSupported}
        error={collection.state.error}
        scannedCount={collection.state.scannedCount}
        totalCount={collection.state.totalCount}
        onClose={collection.actions.closeScanner}
        videoRef={collection.meta.videoRef}
      />
    </>
  );
}
