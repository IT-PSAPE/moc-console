import { useCallback } from "react"
import { Link, useNavigate } from "react-router-dom"
import { BookingDeleteModal } from "@/features/equipment/booking-delete-modal"
import { BookingItemsSection } from "@/features/equipment/booking-items-section"
import { BookingScanModal } from "@/features/equipment/booking-scan-modal"
import { BookingStatusSelect } from "@/features/equipment/booking-status-select"
import { useBookingEditor } from "@/features/equipment/use-booking-editor"
import { UnsavedChangesModal } from "@/features/requests/unsaved-changes-modal"
import { TopBarActions } from "@/features/topbar"
import { useUnsavedNavigationGuard } from "@/hooks/use-unsaved-navigation-guard"
import { routes } from "@/screens/console-routes"
import { Button } from "@moc/ui/components/controls/button"
import { Header } from "@moc/ui/components/display/header"
import { MetaRow } from "@moc/ui/components/display/meta-row"
import { Paragraph } from "@moc/ui/components/display/text"
import { DateTimeFields } from "@moc/ui/components/form/date-time-fields"
import { Input } from "@moc/ui/components/form/input"
import { TextArea } from "@moc/ui/components/form/text-area"
import { DetailPage } from "@moc/ui/components/layout/detail-page"
import { Page } from "@moc/ui/components/layout/page"
import type { Booking } from "@moc/types/equipment"
import { formatUtcIsoForBrowserDateTimeInput } from "@moc/utils/browser-date-time"
import { Calendar, Clock, Loader, Package, Save, ScanLine, StickyNote, Trash2, Undo2, User } from "lucide-react"

export function BookingDetailContent({ booking }: { booking: Booking }) {
  const navigate = useNavigate()
  const handleDeleted = useCallback(() => navigate("/bookings"), [navigate])
  const editor = useBookingEditor(booking, handleDeleted)
  const { store, collection } = editor
  const guard = useUnsavedNavigationGuard({ isDirty: store.state.isDirty, save: editor.actions.save, discard: store.actions.discard })
  const draft = store.state.draft

  function openDelete() {
    editor.actions.setDeleteOpen(true)
  }

  return (
    <DetailPage>
        <DetailPage.Back render={<Link to={`/${routes.bookings}`} />}>Back to bookings</DetailPage.Back>
        <TopBarActions>
          <Button variant="secondary" icon={<ScanLine />} onClick={collection.actions.openScanner} disabled={!collection.state.canScan}>
            {collection.state.isComplete ? "All scanned" : "Scan"}
          </Button>
          {store.state.isDirty && (
            <>
              <Button variant="ghost" icon={<Undo2 />} onClick={store.actions.discard}>Discard</Button>
              <Button icon={<Save />} onClick={editor.actions.save} disabled={store.state.isSaving}>{store.state.isSaving ? "Saving…" : "Save"}</Button>
            </>
          )}
          <Button.Icon aria-label="Delete booking" variant="danger-secondary" icon={<Trash2 />} onClick={openDelete} />
        </TopBarActions>

        <DetailPage.Header>
          <Header.Lead className="gap-3">
            <span className="flex size-14 items-center justify-center rounded-lg bg-secondary text-quaternary"><Package className="size-7" /></span>
            <div className="min-w-0">
              <Page.Title className="truncate">{draft.title}</Page.Title>
              <Paragraph.sm className="text-tertiary">{draft.trackingCode}</Paragraph.sm>
            </div>
          </Header.Lead>
        </DetailPage.Header>

        <DetailPage.Section className="space-y-3">
          <MetaRow icon={<Loader />} label="Status"><BookingStatusSelect status={draft.status} onSelectStatus={editor.actions.selectStatus} /></MetaRow>
          <MetaRow icon={<User />} label="Booked by"><Input aria-label="Booked by" name="booked-by" autoComplete="name" type="text" value={draft.bookedBy} onChange={editor.actions.changeBookedBy} placeholder="Enter name" style="ghost" /></MetaRow>
          <MetaRow icon={<Calendar />} label="Checked out"><DateTimeFields ariaLabel="Checked out" name="checked-out" value={formatUtcIsoForBrowserDateTimeInput(draft.checkedOutDate)} onChange={editor.actions.changeCheckedOutDate} style="ghost" fieldLabels="hidden" required /></MetaRow>
          <MetaRow icon={<Clock />} label="Expected return"><DateTimeFields ariaLabel="Expected return" name="expected-return" value={formatUtcIsoForBrowserDateTimeInput(draft.expectedReturnAt)} onChange={editor.actions.changeExpectedReturn} style="ghost" fieldLabels="hidden" required /></MetaRow>
          <MetaRow icon={<Calendar />} label="Returned"><DateTimeFields ariaLabel="Returned" name="returned" value={draft.returnedDate ? formatUtcIsoForBrowserDateTimeInput(draft.returnedDate) : ""} onChange={editor.actions.changeReturnedDate} style="ghost" fieldLabels="hidden" /></MetaRow>
          <MetaRow icon={<Clock />} label="Duration"><Paragraph.sm>{draft.duration}</Paragraph.sm></MetaRow>
          <MetaRow icon={<StickyNote />} label="Notes">
            <TextArea aria-label="Booking notes" name="booking-notes" value={draft.notes} onChange={editor.actions.changeNotes} placeholder="Add notes…" style="ghost" rows={5} className="w-full whitespace-pre-wrap" />
          </MetaRow>
        </DetailPage.Section>

        <DetailPage.Divider />
        <BookingItemsSection items={draft.items} scannedItemIds={collection.state.scannedItemIds} />

        <UnsavedChangesModal open={guard.state.isBlocked} onSave={guard.actions.saveAndContinue} onDiscard={guard.actions.discardAndContinue} onCancel={guard.actions.cancel} isSaving={store.state.isSaving} />
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
    </DetailPage>
  )
}
