import { Drawer, useDrawer } from "@moc/ui/components/overlays/drawer";
import { Dropdown } from "@moc/ui/components/overlays/dropdown";
import { Divider } from "@moc/ui/components/display/divider";
import { Accordion } from "@moc/ui/components/display/accordion";
import { Badge } from "@moc/ui/components/display/badge";
import { Button } from "@moc/ui/components/controls/button";
import { Label, Paragraph, Title } from "@moc/ui/components/display/text";
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner";
import { MetaRow } from "@/features/requests/request-properties";
import { UnsavedChangesModal } from "@/features/requests/unsaved-changes-modal";
import { DeleteEquipmentModal } from "./delete-equipment-modal";
import { useEquipmentStore } from "./use-equipment-store";
import { useEquipment } from "./equipment-provider";
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider";
import { fetchBookingsByEquipmentId } from "@/data/fetch-equipment";
import { deleteEquipment } from "@/data/mutate-equipment";
import {
  equipmentStatusLabel,
  equipmentStatusColor,
  equipmentCategoryLabel,
  equipmentCategoryColor,
  bookingStatusLabel,
  bookingStatusColor,
} from "@moc/types/equipment";
import type {
  Equipment,
  EquipmentStatus,
  EquipmentCategory,
} from "@moc/types/equipment";
import type { Booking } from "@moc/types/equipment";
import {
  Check,
  ChevronDown,
  Hash,
  History,
  Loader,
  MapPin,
  Maximize2,
  Package,
  StickyNote,
  Tag,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState, type RefObject } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@moc/ui/components/form/input";
import { getErrorMessage } from "@moc/utils/get-error-message";
import { formatUtcIsoInBrowserTimeZone } from "@moc/utils/browser-date-time";

const allStatuses: EquipmentStatus[] = [
  "available",
  "booked",
  "booked_out",
  "maintenance",
];
const allCategories: EquipmentCategory[] = [
  "camera",
  "lens",
  "lighting",
  "audio",
  "support",
  "monitor",
  "cable",
  "accessory",
];

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
          onClick={() => setShowDeleteModal(true)}
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

        {/* Properties */}
        <div className="px-4 space-y-3">
          {/* Serial Number — read-only */}
          <MetaRow icon={<Hash />} label="Serial Number">
            <Paragraph.sm>{draft.serialNumber}</Paragraph.sm>
          </MetaRow>

          {/* Category — dropdown */}
          <MetaRow icon={<Tag />} label="Category">
            <Dropdown placement="bottom">
              <Dropdown.Trigger>
                <Badge
                  label={equipmentCategoryLabel[draft.category]}
                  color={equipmentCategoryColor[draft.category]}
                  className="cursor-pointer"
                />
              </Dropdown.Trigger>
              <Dropdown.Panel>
                {allCategories.map((c) => (
                  <Dropdown.Item
                    key={c}
                    onSelect={() => store.actions.updateField("category", c)}
                  >
                    <span className="size-4 shrink-0 flex items-center justify-center">
                      {c === draft.category && (
                        <Check className="size-3.5 text-brand_secondary" />
                      )}
                    </span>
                    {equipmentCategoryLabel[c]}
                  </Dropdown.Item>
                ))}
              </Dropdown.Panel>
            </Dropdown>
          </MetaRow>

          {/* Status — dropdown */}
          <MetaRow icon={<Loader />} label="Status">
            <Dropdown placement="bottom">
              <Dropdown.Trigger>
                <Badge
                  label={equipmentStatusLabel[draft.status]}
                  color={equipmentStatusColor[draft.status]}
                  className="cursor-pointer"
                />
              </Dropdown.Trigger>
              <Dropdown.Panel>
                {allStatuses.map((s) => (
                  <Dropdown.Item
                    key={s}
                    onSelect={() => store.actions.updateField("status", s)}
                  >
                    <span className="size-4 shrink-0 flex items-center justify-center">
                      {s === draft.status && (
                        <Check className="size-3.5 text-brand_secondary" />
                      )}
                    </span>
                    {equipmentStatusLabel[s]}
                  </Dropdown.Item>
                ))}
              </Dropdown.Panel>
            </Dropdown>
          </MetaRow>

          {/* Location — inline input */}
          <MetaRow icon={<MapPin />} label="Location">
            <Input
              type="text"
              value={draft.location}
              onChange={(e) =>
                store.actions.updateField("location", e.target.value)
              }
              placeholder="Enter location"
              style={"ghost"}
            />
          </MetaRow>

          {/* Booked By — inline input */}
          <MetaRow icon={<User />} label="Booked By">
            <Paragraph.sm>{draft.bookedBy ?? "—"}</Paragraph.sm>
          </MetaRow>
        </div>

        {/* Notes */}
        <Divider className="px-4 py-6" />
        <div className="px-4">
          <div className="flex items-center gap-2 pb-3">
            <StickyNote className="size-4 text-tertiary" />
            <Label.md>Notes</Label.md>
          </div>
          <textarea
            rows={4}
            value={draft.notes}
            onChange={(e) => store.actions.updateField("notes", e.target.value)}
            placeholder={
              draft.status === "maintenance"
                ? "Describe the issue or maintenance required..."
                : "Add notes about this equipment..."
            }
            className="w-full rounded-lg border border-secondary bg-primary px-3 py-2 paragraph-sm focus:border-brand focus:outline-none focus:ring-3 focus:ring-border-brand/10 resize-none"
          />
        </div>

        {/* Booking History */}
        <Divider className="px-4 py-6" />
        <div className="px-4">
          <div className="flex items-center gap-2 pb-3">
            <History className="size-4 text-tertiary" />
            <Label.md>
              Booking History{bookings.length > 0 && ` (${bookings.length})`}
            </Label.md>
          </div>

          {isLoadingBookings ? (
            <LoadingSpinner className="py-6" />
          ) : bookings.length === 0 ? (
            <Paragraph.sm className="text-quaternary">
              No booking history
            </Paragraph.sm>
          ) : (
            <Accordion type="multiple">
              {bookings.map((b) => (
                <Accordion.Item
                  key={b.id}
                  value={b.id}
                  className="border-b border-secondary last:border-b-0"
                >
                  <Accordion.Trigger className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <Label.sm>{b.bookedBy}</Label.sm>
                      <Paragraph.xs className="text-tertiary">
                        {formatUtcIsoInBrowserTimeZone(b.checkedOutDate, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </Paragraph.xs>
                    </div>
                    <div className="flex items-center gap-2">
                      <ChevronDown className="size-4 text-tertiary transition-transform data-[state=open]:rotate-180" />
                    </div>
                  </Accordion.Trigger>
                  <Accordion.Content>
                    <div className="pb-3 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Paragraph.xs className="text-quaternary">
                          Status:
                        </Paragraph.xs>
                        <Badge
                          label={bookingStatusLabel[b.status]}
                          color={bookingStatusColor[b.status]}
                        />
                      </div>
                      {b.returnedDate && (
                        <div className="flex items-center gap-2">
                          <Paragraph.xs className="text-quaternary">
                            Returned:
                          </Paragraph.xs>
                          <Paragraph.xs>
                            {formatUtcIsoInBrowserTimeZone(b.returnedDate, {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </Paragraph.xs>
                        </div>
                      )}
                      {!b.returnedDate && (
                        <div className="flex items-center gap-2">
                          <Paragraph.xs className="text-quaternary">
                            Expected:
                          </Paragraph.xs>
                          <Paragraph.xs>
                            {formatUtcIsoInBrowserTimeZone(b.expectedReturnAt)}
                          </Paragraph.xs>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Paragraph.xs className="text-quaternary">
                          Duration:
                        </Paragraph.xs>
                        <Paragraph.xs>{b.duration}</Paragraph.xs>
                      </div>
                      {b.notes && (
                        <div className="flex items-center gap-2">
                          <Paragraph.xs className="text-quaternary">
                            Notes:
                          </Paragraph.xs>
                          <Paragraph.xs>{b.notes}</Paragraph.xs>
                        </div>
                      )}
                    </div>
                  </Accordion.Content>
                </Accordion.Item>
              ))}
            </Accordion>
          )}
        </div>
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
        onCancel={() => setShowDeleteModal(false)}
        isDeleting={isDeleting}
      />
    </>
  );
}
