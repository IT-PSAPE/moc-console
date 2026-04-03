import { Drawer, useDrawer } from "@/components/overlays/drawer";
import { Dropdown } from "@/components/overlays/dropdown";
import { Divider } from "@/components/display/divider";
import { Accordion } from "@/components/display/accordion";
import { Badge } from "@/components/display/badge";
import { Button } from "@/components/controls/button";
import { Label, Paragraph, Title } from "@/components/display/text";
import { Spinner } from "@/components/feedback/spinner";
import { MetaRow } from "@/features/requests/request-properties";
import { UnsavedChangesModal } from "@/features/requests/unsaved-changes-modal";
import { DeleteEquipmentModal } from "./delete-equipment-modal";
import { useEquipmentStore } from "./use-equipment-store";
import { useEquipment } from "./equipment-provider";
import { useFeedback } from "@/components/feedback/feedback-provider";
import { fetchBookingsByEquipmentId } from "@/data/fetch-equipment";
import { deleteEquipment } from "@/data/mutate-equipment";
import {
  equipmentStatusLabel,
  equipmentStatusColor,
  equipmentCategoryLabel,
  equipmentCategoryColor,
} from "@/types/equipment";
import type { Equipment, EquipmentStatus, EquipmentCategory } from "@/types/equipment";
import type { Booking } from "@/types/equipment";
import { Check, ChevronDown, Hash, History, Loader, MapPin, Maximize2, Package, Tag, Trash2, User, X } from "lucide-react";
import { useCallback, useEffect, useState, type RefObject } from "react";
import { useNavigate } from "react-router-dom";

const allStatuses: EquipmentStatus[] = ["available", "booked_out", "maintenance", "retired"];
const allCategories: EquipmentCategory[] = ["camera", "lens", "lighting", "audio", "support", "monitor", "cable", "accessory"];

export type EquipmentDrawerProps = {
  equipment: Equipment;
  onEquipmentClose?: () => void;
  isDirtyRef?: RefObject<boolean>;
  requestCloseRef?: RefObject<(() => void) | null>;
};

export function EquipmentDrawer({ equipment, onEquipmentClose, isDirtyRef, requestCloseRef }: EquipmentDrawerProps) {
  return (
    <Drawer.Portal>
      <Drawer.Backdrop />
      <Drawer.Panel className="!max-w-lg">
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

function EquipmentDrawerContent({ equipment, onEquipmentClose, isDirtyRef, requestCloseRef }: EquipmentDrawerProps) {
  const { state: drawerState } = useDrawer();
  const navigate = useNavigate();
  const { toast } = useFeedback();
  const { actions: { syncEquipment, removeEquipment } } = useEquipment();

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

  const handleClose = useCallback(() => {
    if (store.state.isDirty) {
      setShowUnsavedModal(true);
      return;
    }
    onEquipmentClose?.();
  }, [store.state.isDirty, onEquipmentClose]);

  function handleOpenFullPage() {
    if (store.state.isDirty) {
      setShowUnsavedModal(true);
      return;
    }
    onEquipmentClose?.();
    navigate(`/equipment/${equipment.id}`);
  }

  const handleSave = useCallback(async () => {
    try {
      await store.actions.save();
      toast({ title: "Equipment saved", variant: "success" });
    } catch {
      toast({ title: "Failed to save equipment", variant: "error" });
    }
  }, [store.actions, toast]);

  // Unsaved changes modal actions
  async function handleModalSave() {
    try {
      await store.actions.save();
      toast({ title: "Equipment saved", variant: "success" });
      setShowUnsavedModal(false);
      onEquipmentClose?.();
    } catch {
      toast({ title: "Failed to save equipment", variant: "error" });
    }
  }

  function handleModalDiscard() {
    store.actions.discard();
    setShowUnsavedModal(false);
    onEquipmentClose?.();
  }

  function handleModalCancel() {
    setShowUnsavedModal(false);
  }

  // Delete
  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteEquipment(equipment.id);
      removeEquipment(equipment.id);
      toast({ title: "Equipment deleted", variant: "success" });
      setShowDeleteModal(false);
      onEquipmentClose?.();
    } catch {
      toast({ title: "Failed to delete equipment", variant: "error" });
    } finally {
      setIsDeleting(false);
    }
  }

  const draft = store.state.draft;

  return (
    <>
      {/* Header */}
      <Drawer.Header className="flex items-center gap-1">
        <Button variant="ghost" icon={<X />} iconOnly onClick={handleClose} />
        <Button variant="ghost" icon={<Maximize2 />} iconOnly onClick={handleOpenFullPage} />
        <div className="flex-1" />
        <Button variant="ghost" icon={<Trash2 />} iconOnly onClick={() => setShowDeleteModal(true)} />
      </Drawer.Header>

      <Drawer.Content className="py-4">
        {/* Thumbnail + Name */}
        <div className="flex items-center gap-3 px-4 pb-4">
          {draft.thumbnail ? (
            <img src={draft.thumbnail} alt={draft.name} className="size-12 rounded-lg object-cover" />
          ) : (
            <span className="flex size-12 items-center justify-center rounded-lg bg-secondary text-quaternary">
              <Package className="size-6" />
            </span>
          )}
          <div>
            <Title.h6>{draft.name}</Title.h6>
            <Paragraph.xs className="text-tertiary">{draft.serialNumber}</Paragraph.xs>
          </div>
        </div>

        {/* Properties */}
        <div className="px-4 space-y-3">
          {/* Serial Number — read-only */}
          <MetaRow icon={<Hash />} label="Serial Number">
            <Paragraph.sm>{draft.serialNumber}</Paragraph.sm>
          </MetaRow>

          {/* Category — dropdown */}
          <MetaRow icon={<Tag />} label="Category">
            <Dropdown.Root placement="bottom">
              <Dropdown.Trigger>
                <Badge
                  label={equipmentCategoryLabel[draft.category]}
                  color={equipmentCategoryColor[draft.category]}
                  className="cursor-pointer"
                />
              </Dropdown.Trigger>
              <Dropdown.Panel>
                {allCategories.map((c) => (
                  <Dropdown.Item key={c} onSelect={() => store.actions.updateField("category", c)}>
                    <span className="size-4 shrink-0 flex items-center justify-center">
                      {c === draft.category && <Check className="size-3.5 text-brand_secondary" />}
                    </span>
                    {equipmentCategoryLabel[c]}
                  </Dropdown.Item>
                ))}
              </Dropdown.Panel>
            </Dropdown.Root>
          </MetaRow>

          {/* Status — dropdown */}
          <MetaRow icon={<Loader />} label="Status">
            <Dropdown.Root placement="bottom">
              <Dropdown.Trigger>
                <Badge
                  label={equipmentStatusLabel[draft.status]}
                  color={equipmentStatusColor[draft.status]}
                  className="cursor-pointer"
                />
              </Dropdown.Trigger>
              <Dropdown.Panel>
                {allStatuses.map((s) => (
                  <Dropdown.Item key={s} onSelect={() => store.actions.updateField("status", s)}>
                    <span className="size-4 shrink-0 flex items-center justify-center">
                      {s === draft.status && <Check className="size-3.5 text-brand_secondary" />}
                    </span>
                    {equipmentStatusLabel[s]}
                  </Dropdown.Item>
                ))}
              </Dropdown.Panel>
            </Dropdown.Root>
          </MetaRow>

          {/* Location — inline input */}
          <MetaRow icon={<MapPin />} label="Location">
            <input
              type="text"
              value={draft.location}
              onChange={(e) => store.actions.updateField("location", e.target.value)}
              placeholder="Enter location"
              className="w-full bg-transparent text-sm text-primary outline-none placeholder:text-quaternary paragraph-sm"
            />
          </MetaRow>

          {/* Booked By — inline input */}
          <MetaRow icon={<User />} label="Booked By">
            <input
              type="text"
              value={draft.bookedBy ?? ""}
              onChange={(e) => store.actions.updateField("bookedBy", e.target.value || null)}
              placeholder="—"
              className="w-full bg-transparent text-sm text-primary outline-none placeholder:text-quaternary paragraph-sm"
            />
          </MetaRow>
        </div>

        {/* Booking History */}
        <Divider className="px-4 py-6" />
        <div className="px-4">
          <div className="flex items-center gap-2 pb-3">
            <History className="size-4 text-tertiary" />
            <Label.md>Booking History{bookings.length > 0 && ` (${bookings.length})`}</Label.md>
          </div>

          {isLoadingBookings ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : bookings.length === 0 ? (
            <Paragraph.sm className="text-quaternary">No booking history</Paragraph.sm>
          ) : (
            <Accordion.Root type="multiple">
              {bookings.map((b) => (
                <Accordion.Item key={b.id} value={b.id} className="border-b border-secondary last:border-b-0">
                  <Accordion.Trigger className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <Label.sm>{b.bookedBy}</Label.sm>
                      <Paragraph.xs className="text-tertiary">
                        {new Date(b.checkedOutDate).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                      </Paragraph.xs>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        label={b.status === "checked_out" ? "Checked Out" : "Returned"}
                        color={b.status === "checked_out" ? "yellow" : "green"}
                      />
                      <ChevronDown className="size-4 text-tertiary transition-transform data-[state=open]:rotate-180" />
                    </div>
                  </Accordion.Trigger>
                  <Accordion.Content className="pb-3 space-y-1.5">
                    {b.returnedDate && (
                      <div className="flex items-center gap-2">
                        <Paragraph.xs className="text-quaternary">Returned:</Paragraph.xs>
                        <Paragraph.xs>{new Date(b.returnedDate).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}</Paragraph.xs>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Paragraph.xs className="text-quaternary">Duration:</Paragraph.xs>
                      <Paragraph.xs>{b.duration}</Paragraph.xs>
                    </div>
                    {b.notes && (
                      <div className="flex items-center gap-2">
                        <Paragraph.xs className="text-quaternary">Notes:</Paragraph.xs>
                        <Paragraph.xs>{b.notes}</Paragraph.xs>
                      </div>
                    )}
                  </Accordion.Content>
                </Accordion.Item>
              ))}
            </Accordion.Root>
          )}
        </div>
      </Drawer.Content>

      {/* Save footer — visible only when dirty */}
      {store.state.isDirty && (
        <Drawer.Footer className="justify-end">
          <Button variant="ghost" onClick={store.actions.discard}>Discard</Button>
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
        onCancel={() => setShowDeleteModal(false)}
        isDeleting={isDeleting}
      />
    </>
  );
}
