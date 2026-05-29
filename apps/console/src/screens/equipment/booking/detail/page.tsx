import { useBreadcrumbOverride } from "@moc/ui/components/navigation/breadcrumb";
import { Badge } from "@moc/ui/components/display/badge";
import { Button } from "@moc/ui/components/controls/button";
import { Divider } from "@moc/ui/components/display/divider";
import { Header } from "@moc/ui/components/display/header";
import { MetaRow } from "@moc/ui/components/display/meta-row";
import { Paragraph, Title } from "@moc/ui/components/display/text";
import { Input } from "@moc/ui/components/form/input";
import { Dropdown } from "@moc/ui/components/overlays/dropdown";
import { Modal } from "@moc/ui/components/overlays/modal";
import { Spinner } from "@moc/ui/components/feedback/spinner";
import { EmptyState } from "@moc/ui/components/feedback/empty-state";
import { TopBarActions } from "@/features/topbar";
import { UnsavedChangesModal } from "@/features/requests/unsaved-changes-modal";
import { useBookingStore } from "@/features/equipment/use-booking-store";
import { useEquipment } from "@/features/equipment/equipment-provider";
import { BookingItemsSection } from "@/features/equipment/booking-items-section";
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider";
import { fetchBookingById } from "@/data/fetch-equipment";
import { deleteBooking } from "@/data/mutate-booking";
import { bookingStatusLabel, bookingStatusColor } from "@moc/types/equipment";
import type { Booking, BookingStatus } from "@moc/types/equipment";
import { Calendar, Check, Clock, ClipboardList, Loader, Package, Pencil, Save, StickyNote, Trash2, Undo2, User } from "lucide-react";
import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { useBlocker, useNavigate, useParams } from "react-router-dom";
import { getErrorMessage } from "@moc/utils/get-error-message";
import { formatUtcIsoForBrowserDateTimeInput, parseBrowserDateTimeInputToUtcIso } from "@moc/utils/browser-date-time";

const allStatuses: BookingStatus[] = ["booked", "checked_out", "returned"];

export function BookingDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  // Track which id the loaded booking belongs to so loading is derived
  // (not set synchronously in the effect) and a stale booking never flashes
  // while a newer id is still fetching.
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const isLoading = loadedId !== (id ?? null);

  useBreadcrumbOverride(id ?? "", booking?.title);

  useEffect(() => {
    let active = true;
    fetchBookingById(id ?? "").then((result) => {
      if (!active) return;
      setBooking(result ?? null);
      setLoadedId(id ?? null);
    });
    return () => {
      active = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <section className="flex justify-center py-16 mx-auto max-w-content-sm">
        <Spinner size="lg" />
      </section>
    );
  }

  if (!booking) {
    return (
      <section className="mx-auto max-w-content-md py-16">
        <EmptyState
          icon={<ClipboardList />}
          title="Booking not found"
          description="This booking may have been deleted, or the link is no longer valid."
        />
      </section>
    );
  }

  return <BookingDetailContent booking={booking} />;
}

function BookingDetailContent({ booking }: { booking: Booking }) {
  const navigate = useNavigate();
  const { toast } = useFeedback();
  const {
    actions: { syncBooking, refreshEquipment, removeBooking },
  } = useEquipment();

  const store = useBookingStore(booking, { syncBooking });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const blocker = useBlocker(store.state.isDirty);

  // Browser close/refresh guard
  useEffect(() => {
    if (!store.state.isDirty) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [store.state.isDirty]);

  const handleSave = useCallback(async () => {
    try {
      await store.actions.save();
      // A booking can hold multiple items, so refetch the whole inventory
      // to keep availability / bookedBy in sync across all of them.
      await refreshEquipment();
      toast({ title: "Booking saved", variant: "success" });
    } catch (error) {
      toast({ title: "Failed to save booking", description: getErrorMessage(error, "The booking could not be saved."), variant: "error" });
    }
  }, [store.actions, refreshEquipment, toast]);

  async function handleBlockerSave() {
    try {
      await store.actions.save();
      await refreshEquipment();
      toast({ title: "Booking saved", variant: "success" });
      if (blocker.state === "blocked") blocker.proceed();
    } catch (error) {
      toast({ title: "Failed to save booking", description: getErrorMessage(error, "The booking could not be saved."), variant: "error" });
    }
  }

  function handleBlockerDiscard() {
    store.actions.discard();
    if (blocker.state === "blocked") blocker.proceed();
  }

  function handleBlockerCancel() {
    if (blocker.state === "blocked") blocker.reset();
  }

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      await deleteBooking(booking.id);
      removeBooking(booking.id);
      await refreshEquipment();
      toast({ title: "Booking deleted", variant: "success" });
      setShowDeleteModal(false);
      navigate("/equipment/bookings");
    } catch (error) {
      toast({ title: "Failed to delete booking", description: getErrorMessage(error, "The booking could not be deleted."), variant: "error" });
    } finally {
      setIsDeleting(false);
    }
  }, [booking.id, navigate, refreshEquipment, removeBooking, toast]);

  function handleSelectStatus(status: BookingStatus) {
    store.actions.updateField("status", status);
    if (status === "returned" && !store.state.draft.returnedDate) {
      store.actions.updateField("returnedDate", new Date().toISOString());
    }
  }

  function handleBookedByChange(event: ChangeEvent<HTMLInputElement>) {
    store.actions.updateField("bookedBy", event.target.value);
  }

  function handleCheckedOutDateChange(event: ChangeEvent<HTMLInputElement>) {
    store.actions.updateField("checkedOutDate", parseBrowserDateTimeInputToUtcIso(event.target.value));
  }

  function handleExpectedReturnChange(event: ChangeEvent<HTMLInputElement>) {
    store.actions.updateField("expectedReturnAt", parseBrowserDateTimeInputToUtcIso(event.target.value));
  }

  function handleReturnedDateChange(event: ChangeEvent<HTMLInputElement>) {
    store.actions.updateField(
      "returnedDate",
      event.target.value ? parseBrowserDateTimeInputToUtcIso(event.target.value) : null,
    );
  }

  function handleNotesChange(event: ChangeEvent<HTMLInputElement>) {
    store.actions.updateField("notes", event.target.value);
  }

  const draft = store.state.draft;

  return (
    <section className="mx-auto max-w-content-md">
      <TopBarActions>
        {store.state.isDirty ? (
          <>
            <Button variant="ghost" icon={<Undo2 />} onClick={store.actions.discard}>Discard</Button>
            <Button icon={<Save />} onClick={handleSave} disabled={store.state.isSaving}>
              {store.state.isSaving ? "Saving..." : "Save"}
            </Button>
          </>
        ) : (
          <Button variant="secondary" icon={<Pencil />}>Edit</Button>
        )}
        <Button.Icon variant="danger-secondary" icon={<Trash2 />} onClick={() => setShowDeleteModal(true)} />
      </TopBarActions>

      {/* Header — title is owned by the requester, so display only. */}
      <Header className="px-4 pt-12">
        <Header.Lead className="gap-3">
          <span className="flex size-14 items-center justify-center rounded-lg bg-secondary text-quaternary">
            <Package className="size-7" />
          </span>
          <div className="min-w-0">
            <Title.h5 className="truncate">{draft.title}</Title.h5>
            <Paragraph.sm className="text-tertiary">{draft.trackingCode}</Paragraph.sm>
          </div>
        </Header.Lead>
      </Header>

      {/* Properties */}
      <div className="p-4 space-y-3">
        <MetaRow icon={<Loader />} label="Status">
          <Dropdown placement="bottom">
            <Dropdown.Trigger>
              <Badge
                label={bookingStatusLabel[draft.status]}
                color={bookingStatusColor[draft.status]}
                className="cursor-pointer"
              />
            </Dropdown.Trigger>
            <Dropdown.Panel>
              {allStatuses.map((s) => (
                <Dropdown.Item key={s} onSelect={() => handleSelectStatus(s)}>
                  <span className="size-4 shrink-0 flex items-center justify-center">
                    {s === draft.status && <Check className="size-3.5 text-brand_secondary" />}
                  </span>
                  {bookingStatusLabel[s]}
                </Dropdown.Item>
              ))}
            </Dropdown.Panel>
          </Dropdown>
        </MetaRow>

        <MetaRow icon={<User />} label="Booked By">
          <Input type="text" value={draft.bookedBy} onChange={handleBookedByChange} placeholder="Enter name" style="ghost" />
        </MetaRow>

        <MetaRow icon={<Calendar />} label="Checked Out">
          <Input type="datetime-local" value={formatUtcIsoForBrowserDateTimeInput(draft.checkedOutDate)} onChange={handleCheckedOutDateChange} style="ghost" />
        </MetaRow>

        <MetaRow icon={<Clock />} label="Expected Return">
          <Input type="datetime-local" value={formatUtcIsoForBrowserDateTimeInput(draft.expectedReturnAt)} onChange={handleExpectedReturnChange} style="ghost" />
        </MetaRow>

        <MetaRow icon={<Calendar />} label="Returned">
          <Input type="datetime-local" value={draft.returnedDate ? formatUtcIsoForBrowserDateTimeInput(draft.returnedDate) : ""} onChange={handleReturnedDateChange} style="ghost" />
        </MetaRow>

        <MetaRow icon={<Clock />} label="Duration">
          <Paragraph.sm>{draft.duration}</Paragraph.sm>
        </MetaRow>

        <MetaRow icon={<StickyNote />} label="Notes">
          <Input type="text" value={draft.notes} onChange={handleNotesChange} placeholder="Add notes..." style="ghost" />
        </MetaRow>
      </div>

      {/* Items */}
      <Divider className="px-4 my-2" />
      <BookingItemsSection items={draft.items} />

      {/* Navigation guard modal */}
      <UnsavedChangesModal
        open={blocker.state === "blocked"}
        onSave={handleBlockerSave}
        onDiscard={handleBlockerDiscard}
        onCancel={handleBlockerCancel}
        isSaving={store.state.isSaving}
      />

      {/* Delete confirmation modal */}
      <Modal open={showDeleteModal} onOpenChange={setShowDeleteModal}>
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
                <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
                <Button variant="danger" onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? "Deleting..." : "Delete Booking"}
                </Button>
              </Modal.Footer>
            </Modal.Panel>
          </Modal.Positioner>
        </Modal.Portal>
      </Modal>
    </section>
  );
}
