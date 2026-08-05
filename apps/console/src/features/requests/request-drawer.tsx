import { Drawer, useDrawer } from "@moc/ui/components/overlays/drawer";
import { Dropdown } from "@moc/ui/components/overlays/dropdown";
import { Divider } from "@moc/ui/components/display/divider";
import { Button } from "@moc/ui/components/controls/button";
import { Title } from "@moc/ui/components/display/text";
import type { Request } from "@moc/types/requests";
import { UnsavedChangesModal } from "./unsaved-changes-modal";
import { DeleteRequestModal } from "./delete-request-modal";
import { useRequests } from "./request-provider";
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner";
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
import { RequestNotes } from "./request-notes";
import { RequestShareActions } from "./request-share-actions";
import { RequestDiscussion } from "./request-discussion";
import { RequestRelatedChecklists } from "./request-related-checklists";
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

export function RequestDrawer({
  request,
  onRequestClose,
  isDirtyRef,
  requestCloseRef,
}: RequestDrawerProps) {
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

function RequestDrawerContent({
  request,
  onRequestClose,
  isDirtyRef,
  requestCloseRef,
}: RequestDrawerProps) {
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

export function RequestPanelContent({
  request,
  onClose,
  open,
  isDirtyRef,
  requestCloseRef,
}: RequestPanelContentProps) {
  const shareTargetRef = useRef<HTMLDivElement | null>(null);
  const {
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
        <SplitPanel.Header className="flex items-center gap-1">
          <Button.Icon aria-label="Close request" variant="ghost" icon={<X />} onClick={guard.actions.requestClose} />
          <Button.Icon
            variant="ghost"
            aria-label="Open full page"
            icon={<Maximize2 />}
            onClick={guard.actions.openFullPage}
          />
          <div className="flex-1" />
          <RequestShareActions.LinkButton />
          <RequestShareActions.ScreenshotButton />
          <Dropdown placement="bottom">
            <Dropdown.Trigger>
              <Button.Icon aria-label="More request actions" variant="ghost" icon={<EllipsisVertical />} />
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
                <Trash2 className="size-4 text-utility-red-600" />
                <span className="text-utility-red-600">Delete</span>
              </Dropdown.Item>
            </Dropdown.Panel>
          </Dropdown>
        </SplitPanel.Header>

        <SplitPanel.Content className="py-4">
          <div ref={shareTargetRef}>
            <div className="px-4 pb-4">
              <Title.h6><RequestTitle value={store.state.draft.title} onChange={handleTitleChange} /></Title.h6>
            </div>

            <div className="px-4">
              <RequestMetaFields
                request={store.state.draft}
                editable
                onFieldChange={store.actions.updateField}
              />
            </div>

            <>
              <Divider className="my-6" />
              <RequestFiveW request={store.state.draft} className="px-4" />
            </>

            {store.state.draft.notes && (
              <>
                <Divider className="my-6" />
                <RequestNotes request={store.state.draft} className="px-4" />
              </>
            )}

            {store.state.draft.flow && (
              <>
                <Divider className="my-6" />
                <RequestFlow request={store.state.draft} className="px-4" />
              </>
            )}

            <Divider className="my-6" />
            {detail.isLoadingAssignees ? (
              <LoadingSpinner className="py-6" />
            ) : (
              <RequestAssigneeList
                assignees={detail.assignees}
                onAddMember={detail.actions.handleAddMember}
                onRemoveMember={detail.actions.handleRemoveMember}
                className="px-4"
              />
            )}
            <Divider className="my-6" />
            <RequestRelatedChecklists checklists={detail.relatedChecklists.checklists} isLoading={detail.relatedChecklists.isLoading} error={detail.relatedChecklists.error} onRetry={detail.actions.refreshRelatedChecklists} />
            <Divider className="my-6" />
            <RequestDiscussion.Root requestId={request.id} refreshKey={store.state.draft.updatedAt} enabled={open}>
              <div className="px-4"><RequestDiscussion.Activity /></div>
              <Divider className="my-6" />
              <div className="px-4"><RequestDiscussion.Comments /></div>
            </RequestDiscussion.Root>
          </div>
        </SplitPanel.Content>
      </RequestShareActions.Root>

      {/* Save footer — visible only when dirty */}
      {store.state.isDirty && (
        <SplitPanel.Footer className="justify-end">
          <Button variant="ghost" onClick={store.actions.discard}>
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
