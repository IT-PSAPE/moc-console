import { UserPlus } from "lucide-react";
import { AssigneeAvatars } from "@/features/assignees/assignee-avatars";
import { MemberPicker } from "@/features/assignees/member-picker";
import { Button } from "@moc/ui/components/controls/button";
import { checklistItemDuties, type ChecklistItem } from "@moc/types/checklists";
import { useChecklistAssigneesContext } from "./checklist-assignees-provider";

export function ChecklistItemAssignees({ item }: { item: ChecklistItem }) {
  const { state, actions } = useChecklistAssigneesContext();
  const assignees = state.assigneesMap.get(item.id) ?? [];

  function add(userId: string, duty: string) { void actions.add(item.id, userId, duty); }
  function remove(userId: string) { void actions.remove(item.id, userId); }

  return (
    <MemberPicker assignees={assignees} duties={checklistItemDuties} onAdd={add} onRemove={remove}>
      <Button.Unstyled aria-label="Assign members" className="flex min-h-11 min-w-11 items-center justify-center gap-1 rounded p-1 text-quaternary transition-colors hover:bg-background-primary-hover hover:text-secondary md:min-h-0 md:min-w-0">
        {assignees.length > 0 ? <AssigneeAvatars assignees={assignees} max={2} /> : <UserPlus className="size-4" />}
      </Button.Unstyled>
    </MemberPicker>
  );
}
