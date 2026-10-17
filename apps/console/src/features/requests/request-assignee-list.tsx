import type { ResolvedAssignee } from "@/data/fetch-assignees";
import { MemberSearchPicker } from "@/features/assignees/member-search-picker";
import { Label } from "@moc/ui/components/display/text";
import type { User } from "@moc/types/requests";

type RequestAssigneeListProps = { assignees: ResolvedAssignee[]; onAddMember: (userId: string, duty: string) => void; onRemoveMember: (userId: string) => void };

export function RequestAssigneeList({ assignees, onAddMember, onRemoveMember }: RequestAssigneeListProps) {
  function handleAdd(user: User) {
    onAddMember(user.id, "");
  }

  return (
    <div>
      <Label.sm className="block pb-3 text-primary">Assignees</Label.sm>
      <MemberSearchPicker assignees={assignees} onAdd={handleAdd} onRemove={onRemoveMember} />
    </div>
  );
}
