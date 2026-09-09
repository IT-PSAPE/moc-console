import { CopyPlus, FolderPlus, Maximize2, Plus, SquarePlus, Trash2, X } from "lucide-react";
import { Button } from "@moc/ui/components/controls/button";
import { Divider } from "@moc/ui/components/display/divider";
import { Paragraph, Title } from "@moc/ui/components/display/text";
import { InlineEditableText } from "@moc/ui/components/form/inline-editable-text";
import { ConfirmationDialog } from "@moc/ui/components/overlays/confirmation-dialog";
import { SplitPanel } from "@moc/ui/components/layout/split-panel";
import { Dropdown } from "@moc/ui/components/overlays/dropdown";
import type { Checklist } from "@moc/types/checklists";
import { useChecklistPanel } from "./use-checklist-panel";
import { ChecklistScheduleField } from "./checklist-schedule-field";
import { ChecklistEditorContent } from "./checklist-editor-content";
import { ChecklistRequestLink } from "./checklist-request-link";

export function ChecklistPanelContent({ checklist, onClose }: { checklist: Checklist; onClose: () => void }) {
  const { state, actions, meta } = useChecklistPanel(checklist, onClose);

  return (
    <>
      <SplitPanel.Header className="flex items-center gap-1">
        <Button.Icon aria-label="Close checklist" variant="ghost" icon={<X />} onClick={actions.close} />
        <Button.Icon aria-label="Open full page" variant="ghost" icon={<Maximize2 />} onClick={actions.openFullPage} />
        <div className="flex-1" />
        <Paragraph.sm className="mr-2 text-tertiary">{meta.checked}/{meta.total} done</Paragraph.sm>
        {checklist.kind === "instance" && <Button.Icon aria-label="Save as checklist template" variant="ghost" icon={<CopyPlus />} onClick={actions.createTemplate} />}
        <Button.Icon aria-label="Delete checklist" variant="danger-secondary" icon={<Trash2 />} onClick={actions.openDelete} />
      </SplitPanel.Header>

      <SplitPanel.Content className="py-4">
        <div className="flex items-start gap-2 px-4 pb-2">
          <div className="mr-auto">
            <Title.h6><InlineEditableText value={checklist.name} onSave={actions.updateName} className="title-h6" /></Title.h6>
            <Paragraph.sm className="pt-1 text-tertiary"><InlineEditableText value={checklist.description} onSave={actions.updateDescription} className="text-sm text-tertiary" placeholder="Add description" /></Paragraph.sm>
          </div>
          <Dropdown placement="bottom">
            <Dropdown.Trigger><Button.Icon aria-label="Add checklist content" variant="ghost" icon={<Plus />} /></Dropdown.Trigger>
            <Dropdown.Panel>
              <Dropdown.Item onSelect={actions.addItem}><SquarePlus className="size-4" />Item</Dropdown.Item>
              <Dropdown.Item onSelect={actions.addSection}><FolderPlus className="size-4" />Section</Dropdown.Item>
            </Dropdown.Panel>
          </Dropdown>
        </div>

        {checklist.kind === "instance" && (
          <div className="px-4 pt-3">
            <ChecklistScheduleField value={meta.scheduledAtInput} onChange={actions.updateScheduledAt} />
            <div className="pt-3"><ChecklistRequestLink linkedRequest={meta.requestLink.state.linkedRequest} requests={meta.requestLink.state.requestOptions} isLoading={meta.requestLink.state.isLoading} onLink={meta.requestLink.actions.link} onUnlink={meta.requestLink.actions.unlink} /></div>
          </div>
        )}

        <Divider className="my-3" />
        <ChecklistEditorContent checklist={checklist} onUpdate={actions.updateChecklist} addRequest={state.addRequest} onAddRequestDismiss={actions.dismissAdd} />
      </SplitPanel.Content>

      <ConfirmationDialog open={state.deleteOpen} onOpenChange={actions.setDeleteOpen} title="Delete checklist?" description="This permanently deletes the checklist and cannot be undone." confirmLabel="Delete checklist" onConfirm={actions.remove} />
    </>
  );
}
