import type { ResolvedAssignee } from "@/data/fetch-assignees";
import { Button } from "@moc/ui/components/controls/button";
import { UserAvatar } from "@moc/ui/components/display/user-avatar";
import { Label, Paragraph } from "@moc/ui/components/display/text";
import { X } from "lucide-react";
import type { MouseEvent } from "react";

type AssignedMemberListProps = {
  assignees: ResolvedAssignee[];
  onRemove: (userId: string) => void;
  emptyLabel?: string;
};

export function AssignedMemberList({ assignees, onRemove, emptyLabel }: AssignedMemberListProps) {
  function handleRemove(event: MouseEvent<HTMLButtonElement>) {
    const userId = event.currentTarget.dataset.userId;
    if (userId) onRemove(userId);
  }

  if (assignees.length === 0) {
    return emptyLabel ? <Paragraph.sm className="text-quaternary">{emptyLabel}</Paragraph.sm> : null;
  }

  return (
    <div className="flex flex-col gap-1">
      {assignees.map((assignee) => (
        <div key={`${assignee.id}-${assignee.duty}`} className="flex min-h-11 items-center gap-2 rounded-lg py-1">
          <UserAvatar size="sm" user={assignee} />
          <div className="min-w-0 flex-1">
            <Label.sm>{assignee.name} {assignee.surname}</Label.sm>
            {assignee.duty ? <Paragraph.xs className="truncate text-quaternary">{assignee.duty}</Paragraph.xs> : null}
          </div>
          <Button.Icon
            aria-label={`Remove ${assignee.name} ${assignee.surname}`}
            icon={<X />}
            variant="ghost"
            data-user-id={assignee.id}
            onClick={handleRemove}
          />
        </div>
      ))}
    </div>
  );
}
