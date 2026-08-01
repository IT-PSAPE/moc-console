import { Drawer, useDrawer } from "@moc/ui/components/overlays/drawer";
import { Divider } from "@moc/ui/components/display/divider";
import { Button } from "@moc/ui/components/controls/button";
import { Paragraph, Title } from "@moc/ui/components/display/text";
import { UnsavedChangesModal } from "@/features/requests/unsaved-changes-modal";
import { DeleteEquipmentModal } from "./delete-equipment-modal";
import { EquipmentPropertiesSection } from "./equipment-properties-section";
import { EquipmentNotesSection } from "./equipment-notes-section";
import { BookingHistorySection } from "./booking-history-section";
import { useEquipmentEditor } from "./use-equipment-editor";
import type { Equipment } from "@moc/types/equipment";
import { Maximize2, Package, Trash2, X } from "lucide-react";
import type { RefObject } from "react";
import { useDrawerClose } from "@/hooks/use-drawer-close";
import { useDrawerEditorGuard } from "@/hooks/use-drawer-editor-guard";

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
  const { state: drawerState } = useDrawer();
  const closeDrawer = useDrawerClose(onEquipmentClose);

  const editor = useEquipmentEditor(equipment, closeDrawer, drawerState.isOpen);
  const { store, bookingHistory } = editor;

  const guard = useDrawerEditorGuard({ close: closeDrawer, discard: store.actions.discard, href: `/equipment/${equipment.id}`, isDirty: store.state.isDirty, isDirtyRef, requestCloseRef, save: editor.actions.save });

  function handleDeleteRequest() {
    editor.actions.setDeleteOpen(true);
  }

  function handleDeleteCancel() {
    editor.actions.setDeleteOpen(false);
  }

  const draft = store.state.draft;

  return (
    <>
      {/* Header */}
      <Drawer.Header className="flex items-center gap-1">
        <Button.Icon aria-label="Close equipment" variant="ghost" icon={<X />} onClick={guard.actions.requestClose} />
        <Button.Icon
          variant="ghost"
          aria-label="Open full page"
          icon={<Maximize2 />}
          onClick={guard.actions.openFullPage}
        />
        <div className="flex-1" />
        <Button.Icon
          variant="ghost"
          aria-label="Delete equipment"
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
              width="48"
              height="48"
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

        <Divider className="my-6" />
        <EquipmentNotesSection
          draft={draft}
          onUpdateField={store.actions.updateField}
        />

        <Divider className="my-6" />
        <BookingHistorySection
          bookings={bookingHistory.state.bookings}
          isLoading={bookingHistory.state.isLoading}
        />
      </Drawer.Content>

      {/* Save footer — visible only when dirty */}
      {store.state.isDirty && (
        <Drawer.Footer className="justify-end">
          <Button variant="ghost" onClick={store.actions.discard}>
            Discard
          </Button>
          <Button onClick={editor.actions.save} disabled={store.state.isSaving}>
            {store.state.isSaving ? "Saving…" : "Save"}
          </Button>
        </Drawer.Footer>
      )}

      {/* Unsaved changes modal */}
      <UnsavedChangesModal
        open={guard.state.isPromptOpen}
        onSave={guard.actions.saveAndClose}
        onDiscard={guard.actions.discardAndClose}
        onCancel={guard.actions.cancel}
        isSaving={store.state.isSaving}
      />

      {/* Delete confirmation modal */}
      <DeleteEquipmentModal
        open={editor.state.deleteOpen}
        onDelete={editor.actions.remove}
        onCancel={handleDeleteCancel}
        isDeleting={editor.state.isDeleting}
      />
    </>
  );
}
