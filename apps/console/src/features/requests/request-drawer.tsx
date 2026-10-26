import { RequestLinkedRecords } from "@/features/request-links/request-linked-records"
import { Drawer, useDrawer } from "@moc/ui/components/overlays/drawer";
import { Dropdown } from "@moc/ui/components/overlays/dropdown";
import { Divider } from "@moc/ui/components/display/divider";
import { Button } from "@moc/ui/components/controls/button";
import { Label } from "@moc/ui/components/display/text";
import type { Request } from "@moc/types/requests";
import { UnsavedChangesModal } from "./unsaved-changes-modal";
import { DeleteRequestModal } from "./delete-request-modal";
import { useRequests } from "./request-provider";
import {
  Archive,
  ArchiveRestore,
  EllipsisVertical,
  Maximize2,
  Trash2,
  X,
} from "lucide-react";
import { useRef, type RefObject } from "react";
import { RequestAssigneeList } from "./request-assignee-list";
import { RequestFiveW } from "./request-five-w";
import { RequestFlow } from "./request-flow";
import { RequestMetaFields } from "./request-meta-fields";
import { RequestShareActions } from "./request-share-actions";
import { ItemDiscussionPanel } from "@/features/item-discussion/item-discussion-panel";
import { RequestTitle } from "./request-title";
import { useRequestDetail } from "./use-request-detail";
import { useDrawerClose } from "@/hooks/use-drawer-close";
import { useDrawerEditorGuard } from "@/hooks/use-drawer-editor-guard";
import { SplitPanel } from "@moc/ui/components/layout/split-panel";

export type RequestDrawerProps = {
  request: Request;
  onRequestClose?: () => void;
  isDirtyRef?: RefObject<boolean>;
  requestCloseRef?: RefObject<(() => void) | null>;
};

export function RequestDrawer({ request, onRequestClose, isDirtyRef, requestCloseRef }: RequestDrawerProps) {
  return (
    <Drawer.Portal>
      <Drawer.Backdrop />
      <Drawer.Panel aria-label={request.title} className="max-w-lg">
        <RequestDrawerContent
          request={request}
          onRequestClose={onRequestClose}
          isDirtyRef={isDirtyRef}
          requestCloseRef={requestCloseRef}
        />
      </Drawer.Panel>
    </Drawer.Portal>
  );
}

function RequestDrawerContent({ request, onRequestClose, isDirtyRef, requestCloseRef }: RequestDrawerProps) {
  const { state: drawerState } = useDrawer();
  const closeDrawer = useDrawerClose(onRequestClose);

  return (
    <RequestPanelContent
      request={request}
      open={drawerState.isOpen}
      onClose={closeDrawer}
      isDirtyRef={isDirtyRef}
      requestCloseRef={requestCloseRef}
    />
  );
}

type RequestPanelContentProps = Omit<RequestDrawerProps, "onRequestClose"> & {
  onClose: () => void;
  open: boolean;
};

export function RequestPanelContent({ request, onClose, open, isDirtyRef, requestCloseRef }: RequestPanelContentProps) {
  const shareTargetRef = useRef<HTMLDivElement | null>(null);
  const {
    state: { requestCategories },
    actions: { syncRequest },
  } = useRequests();

  const detail = useRequestDetail({ request, syncRequest, assigneesEnabled: open, onArchiveChanged: onClose, onDeleted: onClose });
  const { store } = detail;

  const guard = useDrawerEditorGuard({ close: onClose, discard: store.actions.discard, href: `/requests/${request.id}`, isDirty: store.state.isDirty, isDirtyRef, requestCloseRef, save: detail.actions.handleSave });

  function handleTitleChange(value: string) {
    store.actions.updateField("title", value);
  }

  return (
    <>
      {/* Toolbar */}
      <RequestShareActions.Root request={store.state.draft} targetRef={shareTargetRef}>
        <SplitPanel.Header className="gap-2">
          <Button.Icon aria-label="Close request" variant="ghost" size="sm" icon={<X />} onClick={guard.actions.requestClose} />
          <Button.Icon
            variant="ghost"
            size="sm"
            aria-label="Open full page"
            icon={<Maximize2 />}
            onClick={guard.actions.openFullPage}
          />
          <div className="flex-1" />
          <RequestShareActions.LinkButton size="sm" />
          <RequestShareActions.ScreenshotButton size="sm" />
          <RequestShareActions.CopyButton size="sm" />
          <Dropdown placement="bottom">
            <Dropdown.Trigger>
              <Button.Icon aria-label="More request actions" variant="secondary" size="sm" icon={<EllipsisVertical />} />
            </Dropdown.Trigger>
            <Dropdown.Panel>
              <Dropdown.Item onSelect={detail.actions.handleArchiveToggle}>
                {request.status === "archived" ? (
                  <>
                    <ArchiveRestore className="size-4" />
                    Unarchive
                  </>
                ) : (
                  <>
                    <Archive className="size-4" />
                    Archive
                  </>
                )}
              </Dropdown.Item>
              <Dropdown.Separator />
              <Dropdown.Item onSelect={detail.actions.openDeleteModal}>
                <Trash2 className="size-4 text-error" />
                <span className="text-error">Delete</span>
              </Dropdown.Item>
            </Dropdown.Panel>
          </Dropdown>
        </SplitPanel.Header>

        <SplitPanel.Content>
          <div ref={shareTargetRef} className="flex flex-col gap-4">
            <Label.md><RequestTitle value={store.state.draft.title} onChange={handleTitleChange} /></Label.md>

            <RequestMetaFields
              request={store.state.draft}
              categories={requestCategories}
              editable
              onFieldChange={store.actions.updateField}
            >
              <RequestAssigneeList assignees={detail.assignees} label={detail.assigneeLabel} isLoading={detail.isLoadingAssignees} onAddMember={detail.actions.handleAddMember} onRemoveMember={detail.actions.handleRemoveMember} />
              <RequestLinkedRecords request={request} enabled={open} />
            </RequestMetaFields>

            <Divider className="my-0" />
            <RequestFiveW request={store.state.draft} />

            {store.state.draft.flow && (
              <>
                <Divider className="my-0" />
                <RequestFlow request={store.state.draft} />
              </>
            )}

            <Divider className="my-0" />
            <ItemDiscussionPanel kind="request" itemId={request.id} enabled={open} />
          </div>
        </SplitPanel.Content>
      </RequestShareActions.Root>

      {/* Save footer — visible only when dirty */}
      {store.state.isDirty && (
        <SplitPanel.Footer>
          <Button variant="secondary" onClick={store.actions.discard}>
            Discard
          </Button>
          <Button onClick={detail.actions.handleSave} disabled={store.state.isSaving}>
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
      <DeleteRequestModal
        open={detail.showDeleteModal}
        onDelete={detail.actions.handleDelete}
        onCancel={detail.actions.closeDeleteModal}
        isDeleting={detail.isDeleting}
      />
    </>
  );
}
