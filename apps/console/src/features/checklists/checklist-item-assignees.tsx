import { UserPlus } from "lucide-react";
import { AssigneeAvatars } from "@/features/assignees/assignee-avatars";
import { MemberPicker } from "@/features/assignees/member-picker";
import { Button } from "@moc/ui/components/controls/button";
import type { ChecklistItem } from "@moc/types/checklists";
import { useChecklistAssigneesContext } from "./checklist-assignees-provider";

export function ChecklistItemAssignees({ item }: { item: ChecklistItem }) {
  const { state, actions } = useChecklistAssigneesContext();
  const assignees = state.assigneesMap.get(item.id) ?? [];

  function add(userId: string) { void actions.add(item.id, userId); }
  function remove(userId: string) { void actions.remove(item.id, userId); }

  return (
    <MemberPicker assignees={assignees} onAdd={add} onRemove={remove}>
      <Button.Unstyled aria-label="Assign members" className="flex h-control-sm min-w-0 shrink-0 items-center justify-center gap-1 rounded-lg px-1 text-quaternary transition-colors hover:bg-secondary hover:text-secondary landscape:h-control-lg">
        {assignees.length > 0 ? <AssigneeAvatars assignees={assignees} max={2} /> : <UserPlus className="size-4" />}
      </Button.Unstyled>
    </MemberPicker>
  );
}
