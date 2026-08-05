import type { ResolvedAssignee } from "@/data/fetch-assignees";
import { MemberSearchPicker } from "@/features/assignees/member-search-picker";
import { Label } from "@moc/ui/components/display/text";
import type { User } from "@moc/types/requests";
import { cn } from "@moc/utils/cn";

type RequestAssigneeListProps = { assignees: ResolvedAssignee[]; onAddMember: (userId: string, duty: string) => void; onRemoveMember: (userId: string) => void; className?: string };

export function RequestAssigneeList({ assignees, onAddMember, onRemoveMember, className }: RequestAssigneeListProps) {
  function handleAdd(user: User) {
    onAddMember(user.id, "");
  }

  return (
    <div className={cn(className)}>
      <Label.md className="block pb-3">Assignees</Label.md>
      <MemberSearchPicker assignees={assignees} onAdd={handleAdd} onRemove={onRemoveMember} />
    </div>
  );
}
