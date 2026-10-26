import { ItemDiscussionPanel } from "@/features/item-discussion/item-discussion-panel"
import { Drawer, useDrawer } from "@moc/ui/components/overlays/drawer";
import { Divider } from "@moc/ui/components/display/divider";
import { Button } from "@moc/ui/components/controls/button";
import { Label, Paragraph } from "@moc/ui/components/display/text";
import { UnsavedChangesModal } from "@/features/requests/unsaved-changes-modal";
import { DeleteEquipmentModal } from "./delete-equipment-modal";
import { EquipmentPropertiesSection } from "./equipment-properties-section";
import { EquipmentThumbnail } from "./equipment-thumbnail";
import { BookingHistorySection } from "./booking-history-section";
import { useEquipmentEditor } from "./use-equipment-editor";
import type { Equipment } from "@moc/types/equipment";
import { Maximize2, Trash2, X } from "lucide-react";
import type { RefObject } from "react";
import { useDrawerClose } from "@/hooks/use-drawer-close";
import { useDrawerEditorGuard } from "@/hooks/use-drawer-editor-guard";
import { SplitPanel } from "@moc/ui/components/layout/split-panel";

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

  return <EquipmentPanelContent equipment={equipment} open={drawerState.isOpen} onClose={closeDrawer} isDirtyRef={isDirtyRef} requestCloseRef={requestCloseRef} />;
}

type EquipmentPanelContentProps = Omit<EquipmentDrawerProps, "onEquipmentClose"> & {
  onClose: () => void;
  open: boolean;
};

export function EquipmentPanelContent({ equipment, onClose, open, isDirtyRef, requestCloseRef }: EquipmentPanelContentProps) {

  const editor = useEquipmentEditor(equipment, onClose, open);
  const { store, bookingHistory } = editor;

  const guard = useDrawerEditorGuard({ close: onClose, discard: store.actions.discard, href: `/equipment/${equipment.id}`, isDirty: store.state.isDirty, isDirtyRef, requestCloseRef, save: editor.actions.save });

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
      <SplitPanel.Header className="flex items-center gap-1">
        <Button.Icon aria-label="Close equipment" variant="ghost" size="sm" icon={<X />} onClick={guard.actions.requestClose} />
        <Button.Icon
          variant="ghost"
          size="sm"
          aria-label="Open full page"
          icon={<Maximize2 />}
          onClick={guard.actions.openFullPage}
        />
        <div className="flex-1" />
        <Button.Icon
          variant="danger-secondary"
          size="sm"
          aria-label="Delete equipment"
          icon={<Trash2 />}
          onClick={handleDeleteRequest}
        />
      </SplitPanel.Header>

      <SplitPanel.Content>
        {/* Thumbnail + Name */}
        <div className="flex items-center gap-3">
          <EquipmentThumbnail equipment={draft} size="lg" />
          <div>
            <Label.md className="block">{draft.name}</Label.md>
            <Paragraph.sm className="text-tertiary">
              {draft.serialNumber}
            </Paragraph.sm>
          </div>
        </div>

        <EquipmentPropertiesSection
          draft={draft}
          onUpdateField={store.actions.updateField}
        />

        <Divider className="my-0" />
        <BookingHistorySection
          bookings={bookingHistory.state.bookings}
          isLoading={bookingHistory.state.isLoading}
          onNavigate={onClose}
        />

        <Divider className="my-0" />
        <ItemDiscussionPanel kind="equipment" itemId={equipment.id} enabled={open} />
      </SplitPanel.Content>

      {/* Save footer — visible only when dirty */}
      {store.state.isDirty && (
        <SplitPanel.Footer>
          <Button variant="secondary" onClick={store.actions.discard}>
            Discard
          </Button>
          <Button onClick={editor.actions.save} disabled={store.state.isSaving}>
            {store.state.isSaving ? "Saving…" : "Save"}
          </Button>
        </SplitPanel.Footer>
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
