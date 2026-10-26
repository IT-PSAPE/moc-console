import { useDetailReturn } from "@/hooks/use-detail-return"
import { RequestLinkedRecords } from "@/features/request-links/request-linked-records"
import { useRef } from "react"
import { Link } from "react-router-dom"
import { Archive, ArchiveRestore, EllipsisVertical, Save, Trash2, Undo2 } from "lucide-react"
import { DeleteRequestModal } from "@/features/requests/delete-request-modal"
import { RequestAssigneeList } from "@/features/requests/request-assignee-list"
import { RequestFiveW } from "@/features/requests/request-five-w"
import { RequestFlow } from "@/features/requests/request-flow"
import { RequestMetaFields } from "@/features/requests/request-meta-fields"
import { RequestShareActions } from "@/features/requests/request-share-actions"
import { ItemDiscussionPanel } from "@/features/item-discussion/item-discussion-panel"
import { RequestTitle } from "@/features/requests/request-title"
import { UnsavedChangesModal } from "@/features/requests/unsaved-changes-modal"
import { useRequestDetail } from "@/features/requests/use-request-detail"
import { TopBarActions } from "@/features/topbar"
import { routes } from "@/screens/console-routes"
import { Button } from "@moc/ui/components/controls/button"
import { Header } from "@moc/ui/components/display/header"
import { DetailPage } from "@moc/ui/components/layout/detail-page"
import { Page } from "@moc/ui/components/layout/page"
import { Dropdown } from "@moc/ui/components/overlays/dropdown"
import type { Request } from "@moc/types/requests"
import { useRequests } from "@/features/requests/request-provider"

type RequestDetailContentProps = {
  request: Request
  syncRequest: (request: Request) => void
}

export function RequestDetailContent({ request, syncRequest }: RequestDetailContentProps) {
  const back = useDetailReturn(`/${routes.requests}`, "Back to requests")
  const shareTargetRef = useRef<HTMLDivElement | null>(null)
  const { state: { requestCategories } } = useRequests()
  const detail = useRequestDetail({ request, syncRequest })
  const { blockerState, isDeleting, showDeleteModal, store } = detail
  const actions = detail.actions

  function handleTitleChange(value: string) {
    store.actions.updateField("title", value)
  }

  return (
    <DetailPage>
        <DetailPage.Back render={<Link to={back.href} />}>{back.label}</DetailPage.Back>
        <RequestShareActions.Root request={store.state.draft} targetRef={shareTargetRef}>
          <TopBarActions>
            {store.state.isDirty && (
              <>
                <Button variant="ghost" icon={<Undo2 />} onClick={store.actions.discard}>Discard</Button>
                <Button icon={<Save />} onClick={actions.handleSave} disabled={store.state.isSaving}>{store.state.isSaving ? "Saving…" : "Save"}</Button>
              </>
            )}
            <RequestShareActions.LinkButton />
            <RequestShareActions.ScreenshotButton />
            <RequestShareActions.CopyButton />
            <Dropdown placement="bottom">
              <Dropdown.Trigger><Button.Icon aria-label="More request actions" variant="secondary" icon={<EllipsisVertical />} /></Dropdown.Trigger>
              <Dropdown.Panel>
                <Dropdown.Item onSelect={actions.handleArchiveToggle}>
                  {request.status === "archived" ? <><ArchiveRestore className="size-4" />Unarchive</> : <><Archive className="size-4" />Archive</>}
                </Dropdown.Item>
                <Dropdown.Separator />
                <Dropdown.Item onSelect={actions.openDeleteModal}><Trash2 className="size-4 text-error" /><span className="text-error">Delete</span></Dropdown.Item>
              </Dropdown.Panel>
            </Dropdown>
          </TopBarActions>

          <div ref={shareTargetRef}>
            <DetailPage.Header><Header.Lead className="gap-2"><Page.Title><RequestTitle value={store.state.draft.title} onChange={handleTitleChange} /></Page.Title></Header.Lead></DetailPage.Header>
            <DetailPage.Section>
              <RequestMetaFields request={store.state.draft} categories={requestCategories} editable onFieldChange={store.actions.updateField}>
                <RequestAssigneeList assignees={detail.assignees} label={detail.assigneeLabel} isLoading={detail.isLoadingAssignees} onAddMember={actions.handleAddMember} onRemoveMember={actions.handleRemoveMember} />
                <RequestLinkedRecords request={request} />
              </RequestMetaFields>
            </DetailPage.Section>
            <DetailPage.Divider />
            <DetailPage.Section><RequestFiveW request={store.state.draft} /></DetailPage.Section>
            {store.state.draft.flow && <><DetailPage.Divider /><DetailPage.Section><RequestFlow request={store.state.draft} /></DetailPage.Section></>}
            <DetailPage.Divider />
            <DetailPage.Section><ItemDiscussionPanel kind="request" itemId={request.id} /></DetailPage.Section>
          </div>
        </RequestShareActions.Root>

        <UnsavedChangesModal open={blockerState === "blocked"} onSave={actions.handleBlockerSave} onDiscard={actions.handleBlockerDiscard} onCancel={actions.handleBlockerCancel} isSaving={store.state.isSaving} />
        <DeleteRequestModal open={showDeleteModal} onDelete={actions.handleDelete} onCancel={actions.closeDeleteModal} isDeleting={isDeleting} />
    </DetailPage>
  )
}
