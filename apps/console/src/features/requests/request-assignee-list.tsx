import type { ResolvedAssignee } from "@/data/fetch-assignees";
import { AssigneeAvatars } from "@/features/assignees/assignee-avatars";
import { MemberPicker } from "@/features/assignees/member-picker";
import { Button } from "@moc/ui/components/controls/button";
import { MetaRow } from "@moc/ui/components/display/meta-row";
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner";
import { Users } from "lucide-react";

type RequestAssigneeListProps = { assignees: ResolvedAssignee[]; label: string; isLoading: boolean; onAddMember: (userId: string) => void; onRemoveMember: (userId: string) => void };

export function RequestAssigneeList({ assignees, label, isLoading, onAddMember, onRemoveMember }: RequestAssigneeListProps) {
  return (
    <MetaRow icon={<Users />} label="Assignees">
      {isLoading ? <LoadingSpinner size="sm" className="h-control-sm justify-start px-3" /> : (
        <MemberPicker assignees={assignees} onAdd={onAddMember} onRemove={onRemoveMember} placement="bottom-start">
          <Button variant="ghost" size="sm" className="w-full justify-start" aria-label="Assign request members">
            {assignees.length > 0 && <AssigneeAvatars assignees={assignees} max={3} />}
            <span className="min-w-0 truncate">{label}</span>
          </Button>
        </MemberPicker>
      )}
    </MetaRow>
  );
}
