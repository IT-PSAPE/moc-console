import { useBreadcrumbOverride } from "@/components/navigation/breadcrumb";
import { Dropdown } from "@/components/overlays/dropdown";
import { Accordion } from "@/components/display/accordion";
import { Badge } from "@/components/display/badge";
import { Button } from "@/components/controls/button";
import { Divider } from "@/components/display/divider";
import { Header } from "@/components/display/header";
import { Label, Paragraph, Title } from "@/components/display/text";
import { Spinner } from "@/components/feedback/spinner";
import { TopBarActions } from "@/features/topbar";
import { MetaRow } from "@/features/requests/request-properties";
import { UnsavedChangesModal } from "@/features/requests/unsaved-changes-modal";
import { DeleteEquipmentModal } from "@/features/equipment/delete-equipment-modal";
import { useEquipmentStore } from "@/features/equipment/use-equipment-store";
import { useEquipment } from "@/features/equipment/equipment-provider";
import { useFeedback } from "@/components/feedback/feedback-provider";
import { fetchBookingsByEquipmentId } from "@/data/fetch-equipment";
import { deleteEquipment } from "@/data/mutate-equipment";
import {
  equipmentStatusLabel,
  equipmentStatusColor,
  equipmentCategoryLabel,
  equipmentCategoryColor,
  bookingStatusLabel,
  bookingStatusColor,
} from "@/types/equipment";
import type { Equipment, EquipmentStatus, EquipmentCategory, Booking } from "@/types/equipment";
import { Check, ChevronDown, Hash, History, Loader, MapPin, Package, Pencil, Save, StickyNote, Tag, Trash2, Undo2, User } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useBlocker, useNavigate, useParams } from "react-router-dom";
import { Input } from "@/components/form/input";
import { getErrorMessage } from "@/utils/get-error-message";
import { formatUtcIsoInBrowserTimeZone } from "@/utils/browser-date-time";

const allStatuses: EquipmentStatus[] = ["available", "booked", "booked_out", "maintenance"];
const allCategories: EquipmentCategory[] = ["camera", "lens", "lighting", "audio", "support", "monitor", "cable", "accessory"];

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
  const { actions: { syncEquipment, removeEquipment, removeBookingsByEquipmentId } } = useEquipment();

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
      toast({ title: "Failed to save equipment", description: getErrorMessage(error, "The equipment item could not be saved."), variant: "error" });
    }
  }, [store.actions, toast]);

  async function handleBlockerSave() {
    try {
      await store.actions.save();
      toast({ title: "Equipment saved", variant: "success" });
      if (blocker.state === "blocked") blocker.proceed();
    } catch (error) {
      toast({ title: "Failed to save equipment", description: getErrorMessage(error, "The equipment item could not be saved."), variant: "error" });
    }
  }

  function handleBlockerDiscard() {
    store.actions.discard();
    if (blocker.state === "blocked") blocker.proceed();
  }

  function handleBlockerCancel() {
    if (blocker.state === "blocked") blocker.reset();
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteEquipment(equipment.id);
      removeEquipment(equipment.id);
      removeBookingsByEquipmentId(equipment.id);
      toast({ title: "Equipment deleted", variant: "success" });
      setShowDeleteModal(false);
      navigate("/equipment");
    } catch (error) {
      toast({ title: "Failed to delete equipment", description: getErrorMessage(error, "The equipment item could not be deleted."), variant: "error" });
    } finally {
      setIsDeleting(false);
    }
  }

  const draft = store.state.draft;

  return (
    <section className="mx-auto max-w-content-sm">
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

      {/* Header */}
      <Header.Root className="px-4 pt-12">
        <Header.Lead className="gap-3">
          {draft.thumbnail ? (
            <img src={draft.thumbnail} alt={draft.name} className="size-14 rounded-lg object-cover" />
          ) : (
            <span className="flex size-14 items-center justify-center rounded-lg bg-secondary text-quaternary">
              <Package className="size-7" />
            </span>
          )}
          <div>
            <Title.h5>{draft.name}</Title.h5>
            <Paragraph.sm className="text-tertiary">{draft.serialNumber}</Paragraph.sm>
          </div>
        </Header.Lead>
      </Header.Root>

      {/* Properties */}
      <div className="p-4 space-y-3">
        <MetaRow icon={<Hash />} label="Serial Number">
          <Paragraph.sm>{draft.serialNumber}</Paragraph.sm>
        </MetaRow>

        <MetaRow icon={<Tag />} label="Category">
          <Dropdown.Root placement="bottom">
            <Dropdown.Trigger>
              <Badge label={equipmentCategoryLabel[draft.category]} color={equipmentCategoryColor[draft.category]} className="cursor-pointer" />
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

        <MetaRow icon={<Loader />} label="Status">
          <Dropdown.Root placement="bottom">
            <Dropdown.Trigger>
              <Badge label={equipmentStatusLabel[draft.status]} color={equipmentStatusColor[draft.status]} className="cursor-pointer" />
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

        <MetaRow icon={<MapPin />} label="Location">
          <Input
            type="text"
            value={draft.location}
            onChange={(e) => store.actions.updateField("location", e.target.value)}
            placeholder="Enter location"
            style={'ghost'}
          />
        </MetaRow>

        <MetaRow icon={<User />} label="Booked By">
          <Paragraph.sm>{draft.bookedBy ?? "—"}</Paragraph.sm>
        </MetaRow>
      </div>

      {/* Notes */}
      <Divider className="px-4 my-2" />
      <div className="p-4">
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
      <Divider className="px-4 my-2" />
      <div className="p-4">
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
                      {formatUtcIsoInBrowserTimeZone(b.checkedOutDate, { day: "numeric", month: "short", year: "numeric" })}
                    </Paragraph.xs>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChevronDown className="size-4 text-tertiary transition-transform data-[state=open]:rotate-180" />
                  </div>
                </Accordion.Trigger>
                <Accordion.Content>
                  <div className="pb-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Paragraph.xs className="text-quaternary">Status:</Paragraph.xs>
                      <Badge
                        label={bookingStatusLabel[b.status]}
                        color={bookingStatusColor[b.status]}
                      />
                    </div>
                    {b.returnedDate && (
                      <div className="flex items-center gap-2">
                        <Paragraph.xs className="text-quaternary">Returned:</Paragraph.xs>
                        <Paragraph.xs>{formatUtcIsoInBrowserTimeZone(b.returnedDate, { day: "numeric", month: "short", year: "numeric" })}</Paragraph.xs>
                      </div>
                    )}
                    {!b.returnedDate && (
                      <div className="flex items-center gap-2">
                        <Paragraph.xs className="text-quaternary">Expected:</Paragraph.xs>
                        <Paragraph.xs>{formatUtcIsoInBrowserTimeZone(b.expectedReturnAt)}</Paragraph.xs>
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
                  </div>
                </Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        )}
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
        onCancel={() => setShowDeleteModal(false)}
        isDeleting={isDeleting}
      />
    </section>
  );
}
