import { Link } from "react-router-dom"
import { routes } from "@/screens/console-routes"
import { TopBarActions } from "@/features/topbar"
import { Button } from "@moc/ui/components/controls/button"
import { Badge } from "@moc/ui/components/display/badge"
import { Card } from "@moc/ui/components/display/card"
import { Header } from "@moc/ui/components/display/header"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import { EmptyState } from "@moc/ui/components/feedback/empty-state"
import { Spinner } from "@moc/ui/components/feedback/spinner"
import { InlineEditableText } from "@moc/ui/components/form/inline-editable-text"
import { Page } from "@moc/ui/components/layout/page"
import { DetailPage } from "@moc/ui/components/layout/detail-page"
import { ConfirmationDialog } from "@moc/ui/components/overlays/confirmation-dialog"
import { Dropdown } from "@moc/ui/components/overlays/dropdown"
import { CopyPlus, FolderPlus, ListChecks, Plus, SquarePlus, Trash2 } from "lucide-react"
import { useChecklistDetail } from "./use-checklist-detail"
import { ChecklistScheduleField } from "@/features/checklists/checklist-schedule-field"
import { ChecklistEditorContent } from "@/features/checklists/checklist-editor-content"
import { ChecklistRequestLink } from "@/features/checklists/checklist-request-link"
import { ResourceLoadError } from "@/components/feedback/resource-load-error"

export function ChecklistDetailScreen() {
  const { state, actions, meta } = useChecklistDetail()
  const { checklist, counts } = meta

  if (meta.isLoading && !checklist) {
    return <Page><Page.Content width="readable" className="flex justify-center py-16"><Spinner size="lg" /></Page.Content></Page>
  }

  if (meta.error) {
    return <Page><Page.Content width="readable"><ResourceLoadError title="Could not load checklist" error={meta.error} onRetry={meta.retry} /></Page.Content></Page>
  }

  if (!checklist) {
    return (
      <Page>
        <Page.Content width="readable">
          <EmptyState
            headingLevel="h1"
            icon={<ListChecks />}
            title="Checklist not found"
            action={<Button.Link render={<Link to={`/${routes.checklists}`} />} variant="secondary">Back to checklists</Button.Link>}
          />
        </Page.Content>
      </Page>
    )
  }

  return (
    <DetailPage>
        <TopBarActions>
          <Button.Icon aria-label="Delete checklist" variant="danger-secondary" icon={<Trash2 />} onClick={actions.openDelete} />
          {checklist.kind === "instance" && <Button.Icon aria-label="Save as checklist template" variant="secondary" icon={<CopyPlus />} onClick={actions.createTemplate} />}
          <Dropdown placement="bottom">
            <Dropdown.Trigger>
              <Button.Icon aria-label="Add checklist content" variant="secondary" icon={<Plus />} />
            </Dropdown.Trigger>
            <Dropdown.Panel>
              <Dropdown.Item onSelect={actions.addItem}><SquarePlus className="size-4" />Item</Dropdown.Item>
              <Dropdown.Item onSelect={actions.addSection}><FolderPlus className="size-4" />Section</Dropdown.Item>
            </Dropdown.Panel>
          </Dropdown>
        </TopBarActions>

        <DetailPage.Header>
          <Header.Lead className="gap-2">
            <Page.Title><InlineEditableText value={checklist.name} onSave={actions.updateName} className="title-h5" /></Page.Title>
          </Header.Lead>
        </DetailPage.Header>

        <DetailPage.Section className="flex items-center gap-3 pb-0 pt-2">
          <Badge label={`${counts.checked}/${counts.total}`} icon={<ListChecks />} color={counts.checked === counts.total && counts.total > 0 ? "green" : "gray"} />
          <Paragraph.sm className="text-tertiary">
            <InlineEditableText value={checklist.description} onSave={actions.updateDescription} className="text-sm text-tertiary" placeholder="Add description" />
          </Paragraph.sm>
        </DetailPage.Section>

        {checklist.kind === "instance" && (
          <DetailPage.Section className="pb-0 pt-4">
            <ChecklistScheduleField value={meta.scheduledAtInput} onChange={actions.updateScheduledAt} />
            <div className="pt-4"><ChecklistRequestLink linkedRequest={meta.requestLink.state.linkedRequest} requests={meta.requestLink.state.requestOptions} isLoading={meta.requestLink.state.isLoading} onLink={meta.requestLink.actions.link} onUnlink={meta.requestLink.actions.unlink} /></div>
          </DetailPage.Section>
        )}

        <DetailPage.Divider className="my-6" />

        <DetailPage.Section className="pb-8">
          <Label.md className="block pb-4">Items</Label.md>
          <Card.Content className="overflow-hidden">
            <ChecklistEditorContent checklist={checklist} onUpdate={actions.update} addRequest={state.addRequest} onAddRequestDismiss={actions.dismissAdd} />
          </Card.Content>
        </DetailPage.Section>

        <ConfirmationDialog
          open={state.deleteOpen}
          onOpenChange={actions.setDeleteOpen}
          title="Delete checklist?"
          description="This permanently deletes the checklist and cannot be undone."
          confirmLabel="Delete checklist"
          onConfirm={actions.remove}
        />
    </DetailPage>
  )
}
