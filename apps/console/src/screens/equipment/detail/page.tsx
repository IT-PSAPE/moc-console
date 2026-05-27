import { useBreadcrumbOverride } from "@moc/ui/components/navigation/breadcrumb";
import { Button } from "@moc/ui/components/controls/button";
import { Divider } from "@moc/ui/components/display/divider";
import { Header } from "@moc/ui/components/display/header";
import { Paragraph, Title } from "@moc/ui/components/display/text";
import { Spinner } from "@moc/ui/components/feedback/spinner";
import { TopBarActions } from "@/features/topbar";
import { UnsavedChangesModal } from "@/features/requests/unsaved-changes-modal";
import { DeleteEquipmentModal } from "@/features/equipment/delete-equipment-modal";
import { EquipmentPropertiesSection } from "@/features/equipment/equipment-properties-section";
import { EquipmentNotesSection } from "@/features/equipment/equipment-notes-section";
import { BookingHistorySection } from "@/features/equipment/booking-history-section";
import { useEquipmentStore } from "@/features/equipment/use-equipment-store";
import { useEquipment } from "@/features/equipment/equipment-provider";
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider";
import { fetchBookingsByEquipmentId } from "@/data/fetch-equipment";
import { deleteEquipment } from "@/data/mutate-equipment";
import type { Equipment, Booking } from "@moc/types/equipment";
import { Package, Pencil, Save, Trash2, Undo2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useBlocker, useNavigate, useParams } from "react-router-dom";
import { getErrorMessage } from "@moc/utils/get-error-message";

export function EquipmentDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const {
    state: { equipment, isLoadingEquipment },
    actions: { loadEquipment },
  } = useEquipment();

  useEffect(() => {
    loadEquipment();
  }, [loadEquipment]);

  const item = equipment.find((e) => e.id === id) ?? null;

  useBreadcrumbOverride(id ?? "", item?.name);

  if (isLoadingEquipment || !item) {
    return (
      <section className="flex justify-center py-16 mx-auto max-w-content-sm">
        <Spinner size="lg" />
      </section>
    );
  }

  return <EquipmentDetailContent equipment={item} />;
}

function EquipmentDetailContent({ equipment }: { equipment: Equipment }) {
  const navigate = useNavigate();
  const { toast } = useFeedback();
  const {
    actions: { syncEquipment, removeEquipment, removeBookingItemsByEquipmentId },
  } = useEquipment();

  const store = useEquipmentStore(equipment, { syncEquipment });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
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

  // Load booking history
  useEffect(() => {
    setIsLoadingBookings(true);
    fetchBookingsByEquipmentId(equipment.id)
      .then(setBookings)
      .finally(() => setIsLoadingBookings(false));
  }, [equipment.id]);

  const handleSave = useCallback(async () => {
    try {
      await store.actions.save();
      toast({ title: "Equipment saved", variant: "success" });
    } catch (error) {
      toast({
        title: "Failed to save equipment",
        description: getErrorMessage(
          error,
          "The equipment item could not be saved.",
        ),
        variant: "error",
      });
    }
  }, [store.actions, toast]);

  async function handleBlockerSave() {
    try {
      await store.actions.save();
      toast({ title: "Equipment saved", variant: "success" });
      if (blocker.state === "blocked") blocker.proceed();
    } catch (error) {
      toast({
        title: "Failed to save equipment",
        description: getErrorMessage(
          error,
          "The equipment item could not be saved.",
        ),
        variant: "error",
      });
    }
  }

  function handleBlockerDiscard() {
    store.actions.discard();
    if (blocker.state === "blocked") blocker.proceed();
  }

  function handleBlockerCancel() {
    if (blocker.state === "blocked") blocker.reset();
  }

  function handleDeleteRequest() {
    setShowDeleteModal(true);
  }

  function handleDeleteCancel() {
    setShowDeleteModal(false);
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteEquipment(equipment.id);
      removeEquipment(equipment.id);
      removeBookingItemsByEquipmentId(equipment.id);
      toast({ title: "Equipment deleted", variant: "success" });
      setShowDeleteModal(false);
      navigate("/equipment");
    } catch (error) {
      toast({
        title: "Failed to delete equipment",
        description: getErrorMessage(
          error,
          "The equipment item could not be deleted.",
        ),
        variant: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  const draft = store.state.draft;

  return (
    <section className="mx-auto max-w-content-md">
      <TopBarActions>
        {store.state.isDirty ? (
          <>
            <Button
              variant="ghost"
              icon={<Undo2 />}
              onClick={store.actions.discard}
            >
              Discard
            </Button>
            <Button
              icon={<Save />}
              onClick={handleSave}
              disabled={store.state.isSaving}
            >
              {store.state.isSaving ? "Saving..." : "Save"}
            </Button>
          </>
        ) : (
          <Button variant="secondary" icon={<Pencil />}>
            Edit
          </Button>
        )}
        <Button.Icon
          variant="danger-secondary"
          icon={<Trash2 />}
          onClick={handleDeleteRequest}
        />
      </TopBarActions>

      {/* Header */}
      <Header className="px-4 pt-12">
        <Header.Lead className="gap-3">
          {draft.thumbnail ? (
            <img
              src={draft.thumbnail}
              alt={draft.name}
              className="size-14 rounded-lg object-cover"
            />
          ) : (
            <span className="flex size-14 items-center justify-center rounded-lg bg-secondary text-quaternary">
              <Package className="size-7" />
            </span>
          )}
          <div>
            <Title.h5>{draft.name}</Title.h5>
            <Paragraph.sm className="text-tertiary">
              {draft.serialNumber}
            </Paragraph.sm>
          </div>
        </Header.Lead>
      </Header>

      <div className="py-4">
        <EquipmentPropertiesSection
          draft={draft}
          onUpdateField={store.actions.updateField}
        />
      </div>

      {/* Notes */}
      <Divider className="px-4 my-2" />
      <div className="py-4">
        <EquipmentNotesSection
          draft={draft}
          onUpdateField={store.actions.updateField}
        />
      </div>

      {/* Booking History */}
      <Divider className="px-4 my-2" />
      <div className="py-4">
        <BookingHistorySection
          bookings={bookings}
          isLoading={isLoadingBookings}
        />
      </div>

      {/* Navigation guard modal */}
      <UnsavedChangesModal
        open={blocker.state === "blocked"}
        onSave={handleBlockerSave}
        onDiscard={handleBlockerDiscard}
        onCancel={handleBlockerCancel}
        isSaving={store.state.isSaving}
      />

      {/* Delete confirmation modal */}
      <DeleteEquipmentModal
        open={showDeleteModal}
        onDelete={handleDelete}
        onCancel={handleDeleteCancel}
        isDeleting={isDeleting}
      />
    </section>
  );
}
