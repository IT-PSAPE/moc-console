import type { Checklist } from "@moc/types/checklists";
import { ChecklistAssignees } from "./checklist-assignees";
import { ChecklistContent } from "./checklist-content";
import type { ChecklistAddRequest } from "./checklist-types";

type ChecklistEditorContentProps = {
  checklist: Checklist;
  onUpdate: (checklist: Checklist) => void;
  addRequest: ChecklistAddRequest;
  onAddRequestDismiss: () => void;
};

export function ChecklistEditorContent({ checklist, onUpdate, addRequest, onAddRequestDismiss }: ChecklistEditorContentProps) {
  if (checklist.kind === "template") {
    return <ChecklistContent checklist={checklist} onUpdate={onUpdate} addRequest={addRequest} onAddRequestDismiss={onAddRequestDismiss} />;
  }

  return (
    <ChecklistAssignees.Root checklistId={checklist.id}>
      <ChecklistContent checklist={checklist} onUpdate={onUpdate} addRequest={addRequest} onAddRequestDismiss={onAddRequestDismiss} itemSlot={ChecklistAssignees.Item} />
    </ChecklistAssignees.Root>
  );
}
