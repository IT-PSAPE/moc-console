import { Drawer } from "@moc/ui/components/overlays/drawer";
import { Button } from "@moc/ui/components/controls/button";
import { Paragraph, Title } from "@moc/ui/components/display/text";
import { MetaRow } from "@moc/ui/components/display/meta-row";
import { Input } from "@moc/ui/components/form/input";
import { DateTimeFields } from "@moc/ui/components/form/date-time-fields";
import { TextArea } from "@moc/ui/components/form/text-area";
import { UnsavedChangesModal } from "@/features/requests/unsaved-changes-modal";
import { useBookingEditor } from "./use-booking-editor";
import { BookingItemsSection } from "./booking-items-section";
import { BookingDeleteModal } from "./booking-delete-modal";
import { BookingScanModal } from "./booking-scan-modal";
import { BookingStatusSelect } from "./booking-status-select";
import type { Booking } from "@moc/types/equipment";
import { Calendar, Clock, Loader, Maximize2, Package, ScanLine, StickyNote, Trash2, User, X } from "lucide-react";
import type { RefObject } from "react";
import { formatUtcIsoForBrowserDateTimeInput } from "@moc/utils/browser-date-time";
import { useDrawerClose } from "@/hooks/use-drawer-close";
import { useDrawerEditorGuard } from "@/hooks/use-drawer-editor-guard";
import { SplitPanel } from "@moc/ui/components/layout/split-panel";

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
  const closeDrawer = useDrawerClose(onBookingClose);

  return <BookingPanelContent booking={booking} onClose={closeDrawer} isDirtyRef={isDirtyRef} requestCloseRef={requestCloseRef} />;
}

type BookingPanelContentProps = Omit<BookingDrawerProps, "onBookingClose"> & {
  onClose: () => void;
};

export function BookingPanelContent({ booking, onClose, isDirtyRef, requestCloseRef }: BookingPanelContentProps) {

  const editor = useBookingEditor(booking, onClose);
  const { store, collection } = editor;

  const guard = useDrawerEditorGuard({ close: onClose, discard: store.actions.discard, href: `/bookings/${booking.id}`, isDirty: store.state.isDirty, isDirtyRef, requestCloseRef, save: editor.actions.save });

  function handleDeleteRequest() {
    editor.actions.setDeleteOpen(true);
  }

  const draft = store.state.draft;

  return (
    <>
      <SplitPanel.Header className="flex items-center gap-1">
        <Button.Icon aria-label="Close booking" variant="ghost" icon={<X />} onClick={guard.actions.requestClose} />
        <div className="flex-1" />
        <Button.Icon
          variant="secondary"
          aria-label={collection.state.isComplete ? "All items scanned" : "Scan booking items"}
          disabled={!collection.state.canScan}
          icon={<ScanLine />}
          onClick={collection.actions.openScanner}
        />
        <Button.Icon variant="ghost" icon={<Maximize2 />} onClick={guard.actions.openFullPage} aria-label="Open full page" />
        <Button.Icon aria-label="Delete booking" variant="danger-secondary" icon={<Trash2 />} onClick={handleDeleteRequest} />
      </SplitPanel.Header>

      <SplitPanel.Content className="py-4">
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
            <BookingStatusSelect status={draft.status} onSelectStatus={editor.actions.selectStatus} />
          </MetaRow>

          {/* Booked By */}
          <MetaRow icon={<User />} label="Booked by">
            <Input
              aria-label="Booked by"
              name="booked-by"
              autoComplete="name"
              type="text"
              value={draft.bookedBy}
              onChange={editor.actions.changeBookedBy}
              placeholder="Enter name"
              style="ghost"
            />
          </MetaRow>

          {/* Checked Out */}
          <MetaRow icon={<Calendar />} label="Checked out">
            <DateTimeFields
              ariaLabel="Checked out"
              name="checked-out"
              value={formatUtcIsoForBrowserDateTimeInput(draft.checkedOutDate)}
              onChange={editor.actions.changeCheckedOutDate}
              style="ghost"
              fieldLabels="hidden"
              required
              fieldsClassName="sm:grid-cols-2"
            />
          </MetaRow>

          {/* Expected Return */}
          <MetaRow icon={<Clock />} label="Expected return">
            <DateTimeFields
              ariaLabel="Expected return"
              name="expected-return"
              value={formatUtcIsoForBrowserDateTimeInput(draft.expectedReturnAt)}
              onChange={editor.actions.changeExpectedReturn}
              style="ghost"
              fieldLabels="hidden"
              required
              fieldsClassName="sm:grid-cols-2"
            />
          </MetaRow>

          {/* Returned */}
          <MetaRow icon={<Calendar />} label="Returned">
            <DateTimeFields
              ariaLabel="Returned"
              name="returned"
              value={draft.returnedDate ? formatUtcIsoForBrowserDateTimeInput(draft.returnedDate) : ""}
              onChange={editor.actions.changeReturnedDate}
              style="ghost"
              fieldLabels="hidden"
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
              aria-label="Booking notes"
              name="booking-notes"
              value={draft.notes}
              onChange={editor.actions.changeNotes}
              placeholder="Add notes…"
              style="ghost"
              rows={5}
              className="w-full whitespace-pre-wrap"
            />
          </MetaRow>
        </div>

        {/* Items */}
        <BookingItemsSection items={draft.items} scannedItemIds={collection.state.scannedItemIds} onNavigate={onClose} />
      </SplitPanel.Content>

      {store.state.isDirty && (
        <SplitPanel.Footer className="justify-end">
          <Button variant="ghost" onClick={store.actions.discard}>Discard</Button>
          <Button onClick={editor.actions.save} disabled={store.state.isSaving}>
            {store.state.isSaving ? "Saving…" : "Save"}
          </Button>
        </SplitPanel.Footer>
      )}

      <UnsavedChangesModal
        open={guard.state.isPromptOpen}
        onSave={guard.actions.saveAndClose}
        onDiscard={guard.actions.discardAndClose}
        onCancel={guard.actions.cancel}
        isSaving={store.state.isSaving}
      />

      <BookingDeleteModal open={editor.state.deleteOpen} isDeleting={editor.state.isDeleting} onConfirm={editor.actions.remove} onOpenChange={editor.actions.setDeleteOpen} />
      <BookingScanModal
        open={collection.state.isOpen}
        isStarting={collection.state.isStarting}
        isSupported={collection.state.isSupported}
        error={collection.state.error}
        scannedCount={collection.state.scannedCount}
        totalCount={collection.state.totalCount}
        manualCode={collection.state.manualCode}
        onClose={collection.actions.closeScanner}
        onManualCodeChange={collection.actions.setManualCode}
        onManualCodeSubmit={collection.actions.submitManualCode}
        videoRef={collection.meta.videoRef}
      />
    </>
  );
}
