import { useRef } from "react"
import { Archive, ArchiveRestore, EllipsisVertical, Save, Trash2, Undo2 } from "lucide-react"
import { DeleteRequestModal } from "@/features/requests/delete-request-modal"
import { RequestAssigneeList } from "@/features/requests/request-assignee-list"
import { RequestFiveW } from "@/features/requests/request-five-w"
import { RequestFlow } from "@/features/requests/request-flow"
import { RequestMetaFields } from "@/features/requests/request-meta-fields"
import { RequestNotes } from "@/features/requests/request-notes"
import { RequestShareActions } from "@/features/requests/request-share-actions"
import { UnsavedChangesModal } from "@/features/requests/unsaved-changes-modal"
import { useRequestDetail } from "@/features/requests/use-request-detail"
import { TopBarActions } from "@/features/topbar"
import { Button } from "@moc/ui/components/controls/button"
import { DocEditor } from "@moc/ui/components/display/doc-editor/doc-editor"
import { Header } from "@moc/ui/components/display/header"
import { Label } from "@moc/ui/components/display/text"
import { DetailPage } from "@moc/ui/components/layout/detail-page"
import { Page } from "@moc/ui/components/layout/page"
import { Dropdown } from "@moc/ui/components/overlays/dropdown"
import type { Request } from "@moc/types/requests"

type RequestDetailContentProps = {
  request: Request
  syncRequest: (request: Request) => void
}

export function RequestDetailContent({ request, syncRequest }: RequestDetailContentProps) {
  const shareTargetRef = useRef<HTMLDivElement | null>(null)
  const detail = useRequestDetail({ request, syncRequest })
  const { assignees, blockerState, isDeleting, showDeleteModal, store } = detail
  const actions = detail.actions

  return (
    <DetailPage>
        <RequestShareActions.Root request={store.state.draft} targetRef={shareTargetRef}>
          <TopBarActions>
            {store.state.isDirty && (
              <>
                <Button variant="ghost" icon={<Undo2 />} onClick={store.actions.discard}>Discard</Button>
                <Button icon={<Save />} onClick={actions.handleSave} disabled={store.state.isSaving}>{store.state.isSaving ? "Saving…" : "Save"}</Button>
              </>
            )}
            <RequestShareActions.LinkButton variant="secondary" />
            <RequestShareActions.ScreenshotButton variant="secondary" />
            <Dropdown placement="bottom">
              <Dropdown.Trigger><Button.Icon aria-label="More request actions" variant="secondary" icon={<EllipsisVertical />} /></Dropdown.Trigger>
              <Dropdown.Panel>
                <Dropdown.Item onSelect={actions.handleArchiveToggle}>
                  {request.status === "archived" ? <><ArchiveRestore className="size-4" />Unarchive</> : <><Archive className="size-4" />Archive</>}
                </Dropdown.Item>
                <Dropdown.Separator />
                <Dropdown.Item onSelect={actions.openDeleteModal}><Trash2 className="size-4 text-utility-red-600" /><span className="text-utility-red-600">Delete</span></Dropdown.Item>
              </Dropdown.Panel>
            </Dropdown>
          </TopBarActions>

          <div ref={shareTargetRef}>
            <DetailPage.Header><Header.Lead className="gap-2"><Page.Title>{store.state.draft.title}</Page.Title></Header.Lead></DetailPage.Header>
            <DetailPage.Section><RequestMetaFields request={store.state.draft} editable onFieldChange={store.actions.updateField} /></DetailPage.Section>
            <DetailPage.Divider />
            <DetailPage.Section><RequestFiveW request={store.state.draft} /></DetailPage.Section>
            {store.state.draft.notes && <><DetailPage.Divider /><DetailPage.Section><RequestNotes request={store.state.draft} /></DetailPage.Section></>}
            {store.state.draft.flow && <><DetailPage.Divider /><DetailPage.Section><RequestFlow request={store.state.draft} /></DetailPage.Section></>}
            <DetailPage.Divider />
            <DetailPage.Section><RequestAssigneeList assignees={assignees} onAddMember={actions.handleAddMember} onRemoveMember={actions.handleRemoveMember} /></DetailPage.Section>
            <DetailPage.Divider />
            <DetailPage.Section>
              <Label.md className="block pb-3">Content</Label.md>
              <DocEditor value={store.state.draft.content ?? ""} onChange={actions.handleContentChange} placeholder="Add notes, details, or additional context…" className="w-full" />
            </DetailPage.Section>
          </div>
        </RequestShareActions.Root>

        <UnsavedChangesModal open={blockerState === "blocked"} onSave={actions.handleBlockerSave} onDiscard={actions.handleBlockerDiscard} onCancel={actions.handleBlockerCancel} isSaving={store.state.isSaving} />
        <DeleteRequestModal open={showDeleteModal} onDelete={actions.handleDelete} onCancel={actions.closeDeleteModal} isDeleting={isDeleting} />
    </DetailPage>
  )
}
