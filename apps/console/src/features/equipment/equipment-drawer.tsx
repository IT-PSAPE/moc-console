import { Drawer, useDrawer } from "@moc/ui/components/overlays/drawer";
import { Divider } from "@moc/ui/components/display/divider";
import { Button } from "@moc/ui/components/controls/button";
import { Paragraph, Title } from "@moc/ui/components/display/text";
import { UnsavedChangesModal } from "@/features/requests/unsaved-changes-modal";
import { DeleteEquipmentModal } from "./delete-equipment-modal";
import { EquipmentPropertiesSection } from "./equipment-properties-section";
import { EquipmentNotesSection } from "./equipment-notes-section";
import { BookingHistorySection } from "./booking-history-section";
import { useEquipmentStore } from "./use-equipment-store";
import { useEquipment } from "./equipment-provider";
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider";
import { fetchBookingsByEquipmentId } from "@/data/fetch-equipment";
import { deleteEquipment } from "@/data/mutate-equipment";
import type { Equipment } from "@moc/types/equipment";
import type { Booking } from "@moc/types/equipment";
import { Maximize2, Package, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState, type RefObject } from "react";
import { useNavigate } from "react-router-dom";
import { getErrorMessage } from "@moc/utils/get-error-message";

export type EquipmentDrawerProps = {
  equipment: Equipment;
  onEquipmentClose?: () => void;
  isDirtyRef?: RefObject<boolean>;
  requestCloseRef?: RefObject<(() => void) | null>;
};

export function EquipmentDrawer({
  equipment,
  onEquipmentClose,
  isDirtyRef,
  requestCloseRef,
}: EquipmentDrawerProps) {
  return (
    <Drawer.Portal>
      <Drawer.Backdrop />
      <Drawer.Panel className="max-w-lg">
        <EquipmentDrawerContent
          equipment={equipment}
          onEquipmentClose={onEquipmentClose}
          isDirtyRef={isDirtyRef}
          requestCloseRef={requestCloseRef}
        />
      </Drawer.Panel>
    </Drawer.Portal>
  );
}

function EquipmentDrawerContent({
  equipment,
  onEquipmentClose,
  isDirtyRef,
  requestCloseRef,
}: EquipmentDrawerProps) {
  const { state: drawerState, actions: drawerActions } = useDrawer();
  const navigate = useNavigate();
  const { toast } = useFeedback();
  const {
    actions: { syncEquipment, removeEquipment, removeBookingsByEquipmentId },
  } = useEquipment();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const store = useEquipmentStore(equipment, { syncEquipment });

  // Sync dirty state to parent ref
  useEffect(() => {
    if (isDirtyRef) isDirtyRef.current = store.state.isDirty;
  }, [isDirtyRef, store.state.isDirty]);

  // Register close-with-modal handler
  useEffect(() => {
    if (requestCloseRef) {
      requestCloseRef.current = () => setShowUnsavedModal(true);
    }
    return () => {
      if (requestCloseRef) requestCloseRef.current = null;
    };
  }, [requestCloseRef]);

  // Load booking history
  useEffect(() => {
    if (!drawerState.isOpen) return;
    setIsLoadingBookings(true);
    fetchBookingsByEquipmentId(equipment.id)
      .then(setBookings)
      .finally(() => setIsLoadingBookings(false));
  }, [drawerState.isOpen, equipment.id]);

  const closeDrawer = useCallback(() => {
    if (onEquipmentClose) {
      onEquipmentClose();
      return;
    }
    drawerActions.close();
  }, [onEquipmentClose, drawerActions]);

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
    navigate(`/equipment/${equipment.id}`);
  }

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

  // Unsaved changes modal actions
  async function handleModalSave() {
    try {
      await store.actions.save();
      toast({ title: "Equipment saved", variant: "success" });
      setShowUnsavedModal(false);
      closeDrawer();
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

  function handleModalDiscard() {
    store.actions.discard();
    setShowUnsavedModal(false);
    closeDrawer();
  }

  function handleModalCancel() {
    setShowUnsavedModal(false);
  }

  function handleDeleteRequest() {
    setShowDeleteModal(true);
  }

  function handleDeleteCancel() {
    setShowDeleteModal(false);
  }

  // Delete
  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteEquipment(equipment.id);
      removeEquipment(equipment.id);
      removeBookingsByEquipmentId(equipment.id);
      toast({ title: "Equipment deleted", variant: "success" });
      setShowDeleteModal(false);
      closeDrawer();
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
    <>
      {/* Header */}
      <Drawer.Header className="flex items-center gap-1">
        <Button.Icon variant="ghost" icon={<X />} onClick={handleClose} />
        <Button.Icon
          variant="ghost"
          icon={<Maximize2 />}
          onClick={handleOpenFullPage}
        />
        <div className="flex-1" />
        <Button.Icon
          variant="ghost"
          icon={<Trash2 />}
          onClick={handleDeleteRequest}
        />
      </Drawer.Header>

      <Drawer.Content className="py-4">
        {/* Thumbnail + Name */}
        <div className="flex items-center gap-3 px-4 pb-4">
          {draft.thumbnail ? (
            <img
              src={draft.thumbnail}
              alt={draft.name}
              className="size-12 rounded-lg object-cover"
            />
          ) : (
            <span className="flex size-12 items-center justify-center rounded-lg bg-secondary text-quaternary">
              <Package className="size-6" />
            </span>
          )}
          <div>
            <Title.h6>{draft.name}</Title.h6>
            <Paragraph.xs className="text-tertiary">
              {draft.serialNumber}
            </Paragraph.xs>
          </div>
        </div>

        <EquipmentPropertiesSection
          draft={draft}
          onUpdateField={store.actions.updateField}
        />

        <Divider className="px-4 py-6" />
        <EquipmentNotesSection
          draft={draft}
          onUpdateField={store.actions.updateField}
        />

        <Divider className="px-4 py-6" />
        <BookingHistorySection
          bookings={bookings}
          isLoading={isLoadingBookings}
        />
      </Drawer.Content>

      {/* Save footer — visible only when dirty */}
      {store.state.isDirty && (
        <Drawer.Footer className="justify-end">
          <Button variant="ghost" onClick={store.actions.discard}>
            Discard
          </Button>
          <Button onClick={handleSave} disabled={store.state.isSaving}>
            {store.state.isSaving ? "Saving..." : "Save"}
          </Button>
        </Drawer.Footer>
      )}

      {/* Unsaved changes modal */}
      <UnsavedChangesModal
        open={showUnsavedModal}
        onSave={handleModalSave}
        onDiscard={handleModalDiscard}
        onCancel={handleModalCancel}
        isSaving={store.state.isSaving}
      />

      {/* Delete confirmation modal */}
      <DeleteEquipmentModal
        open={showDeleteModal}
        onDelete={handleDelete}
        onCancel={handleDeleteCancel}
        isDeleting={isDeleting}
      />
    </>
  );
}
