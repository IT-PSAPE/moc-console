import { ItemDiscussionPanel } from "@/features/item-discussion/item-discussion-panel"
import { CopyPlus, FolderPlus, Maximize2, Plus, SquarePlus, Trash2, X } from "lucide-react";
import { Button } from "@moc/ui/components/controls/button";
import { Divider } from "@moc/ui/components/display/divider";
import { Label, Paragraph } from "@moc/ui/components/display/text";
import { InlineEditableText } from "@moc/ui/components/form/inline-editable-text";
import { ConfirmationDialog } from "@moc/ui/components/overlays/confirmation-dialog";
import { SplitPanel } from "@moc/ui/components/layout/split-panel";
import { Dropdown } from "@moc/ui/components/overlays/dropdown";
import type { Checklist } from "@moc/types/checklists";
import { useChecklistPanel } from "./use-checklist-panel";
import { ChecklistEditorContent } from "./checklist-editor-content";
import { RequestLinkField } from "@/features/request-links/request-link-field";

export function ChecklistPanelContent({ checklist, open, onClose }: { checklist: Checklist; open: boolean; onClose: () => void }) {
  const { state, actions, meta } = useChecklistPanel(checklist, onClose);

  return (
    <>
      <SplitPanel.Header className="flex items-center gap-1">
        <Button.Icon aria-label="Close checklist" variant="ghost" size="sm" icon={<X />} onClick={actions.close} />
        <Button.Icon aria-label="Open full page" variant="ghost" size="sm" icon={<Maximize2 />} onClick={actions.openFullPage} />
        <div className="flex-1" />
        <Paragraph.sm className="mr-2 text-tertiary">{meta.checked}/{meta.total} done</Paragraph.sm>
        {checklist.kind === "instance" && <Button.Icon aria-label="Save as checklist template" variant="ghost" size="sm" icon={<CopyPlus />} onClick={actions.createTemplate} />}
        <Button.Icon aria-label="Delete checklist" variant="danger-secondary" size="sm" icon={<Trash2 />} onClick={actions.openDelete} />
      </SplitPanel.Header>

      <SplitPanel.Content>
        <div className="flex items-start gap-2">
          <div className="mr-auto">
            <Label.md><InlineEditableText value={checklist.name} onSave={actions.updateName} className="label-md" /></Label.md>
            <Paragraph.sm className="pt-1 text-tertiary"><InlineEditableText value={checklist.description} onSave={actions.updateDescription} className="paragraph-sm" placeholder="Add description" /></Paragraph.sm>
          </div>
          <Dropdown placement="bottom">
            <Dropdown.Trigger><Button.Icon aria-label="Add checklist content" variant="ghost" size="sm" icon={<Plus />} /></Dropdown.Trigger>
            <Dropdown.Panel>
              <Dropdown.Item onSelect={actions.addItem}><SquarePlus className="size-4" />Item</Dropdown.Item>
              <Dropdown.Item onSelect={actions.addSection}><FolderPlus className="size-4" />Section</Dropdown.Item>
            </Dropdown.Panel>
          </Dropdown>
        </div>

        {checklist.kind === "instance" && <RequestLinkField kind="checklist" id={checklist.id} />}

        <Divider className="my-0" />
        <ChecklistEditorContent checklist={checklist} onUpdate={actions.updateChecklist} addRequest={state.addRequest} onAddRequestDismiss={actions.dismissAdd} />

        <Divider className="my-0" />
        <ItemDiscussionPanel kind="checklist" itemId={checklist.id} enabled={open} />
      </SplitPanel.Content>

      <ConfirmationDialog open={state.deleteOpen} onOpenChange={actions.setDeleteOpen} title="Delete checklist?" description="This permanently deletes the checklist and cannot be undone." confirmLabel="Delete checklist" onConfirm={actions.remove} />
    </>
  );
}
