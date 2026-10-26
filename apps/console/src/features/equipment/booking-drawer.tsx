import { ItemDiscussionPanel } from "@/features/item-discussion/item-discussion-panel"
import { RequestLinkField } from "@/features/request-links/request-link-field"
import { Drawer, useDrawer } from "@moc/ui/components/overlays/drawer";
import { Button } from "@moc/ui/components/controls/button";
import { Divider } from "@moc/ui/components/display/divider";
import { Label, Paragraph } from "@moc/ui/components/display/text";
import { MetaRow } from "@moc/ui/components/display/meta-row";
import { Input } from "@moc/ui/components/form/input";
import { DateTimeFields } from "@moc/ui/components/form/date-time-fields";
import { UnsavedChangesModal } from "@/features/requests/unsaved-changes-modal";
import { useBookingEditor } from "./use-booking-editor";
import { BookingItemsSection } from "./booking-items-section";
import { BookingDeleteModal } from "./booking-delete-modal";
import { BookingScanModal } from "./booking-scan-modal";
import { BookingStatusSelect } from "./booking-status-select";
import { BookingThumbnail } from "./booking-thumbnail";
import type { Booking } from "@moc/types/equipment";
import { Calendar, Clock, Loader, Maximize2, ScanLine, Trash2, User, X } from "lucide-react";
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
  const { state: drawerState } = useDrawer();
  const closeDrawer = useDrawerClose(onBookingClose);

  return <BookingPanelContent booking={booking} open={drawerState.isOpen} onClose={closeDrawer} isDirtyRef={isDirtyRef} requestCloseRef={requestCloseRef} />;
}

type BookingPanelContentProps = Omit<BookingDrawerProps, "onBookingClose"> & {
  onClose: () => void;
  open: boolean;
};

export function BookingPanelContent({ booking, open, onClose, isDirtyRef, requestCloseRef }: BookingPanelContentProps) {

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
        <Button.Icon aria-label="Close booking" variant="ghost" size="sm" icon={<X />} onClick={guard.actions.requestClose} />
        <div className="flex-1" />
        <Button.Icon
          variant="secondary"
          size="sm"
          aria-label={collection.state.isComplete ? "All items scanned" : "Scan booking items"}
          disabled={!collection.state.canScan}
          icon={<ScanLine />}
          onClick={collection.actions.openScanner}
        />
        <Button.Icon variant="ghost" size="sm" icon={<Maximize2 />} onClick={guard.actions.openFullPage} aria-label="Open full page" />
        <Button.Icon aria-label="Delete booking" variant="danger-secondary" size="sm" icon={<Trash2 />} onClick={handleDeleteRequest} />
      </SplitPanel.Header>

      <SplitPanel.Content>
        {/* Header — title is owned by the requester, so display only. */}
        <div className="flex items-center gap-3">
          <BookingThumbnail />
          <div className="min-w-0">
            <Label.md className="block truncate">{draft.title}</Label.md>
            <Paragraph.sm className="text-tertiary">Booking</Paragraph.sm>
          </div>
        </div>

        {/* Properties */}
        <div className="space-y-3">
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
            />
          </MetaRow>

          {/* Duration — read-only */}
          <MetaRow icon={<Clock />} label="Duration">
            <Paragraph.sm>{draft.duration}</Paragraph.sm>
          </MetaRow>

          <RequestLinkField kind="booking" id={booking.id} />

        </div>

        <Divider className="my-0" />
        {/* Items */}
        <BookingItemsSection items={draft.items} scannedItemIds={collection.state.scannedItemIds} onNavigate={onClose} />

        <Divider className="my-0" />
        <ItemDiscussionPanel kind="booking" itemId={booking.id} enabled={open} />
      </SplitPanel.Content>

      {store.state.isDirty && (
        <SplitPanel.Footer>
          <Button variant="secondary" onClick={store.actions.discard}>Discard</Button>
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
