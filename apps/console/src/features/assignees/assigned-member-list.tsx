import type { ResolvedAssignee } from "@/data/fetch-assignees";
import { Button } from "@moc/ui/components/controls/button";
import { ListItemCard } from "@moc/ui/components/display/list-item-card";
import { UserAvatar } from "@moc/ui/components/display/user-avatar";
import { Paragraph } from "@moc/ui/components/display/text";
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
    <div className="flex flex-col">
      {assignees.map((assignee) => (
        <ListItemCard.Root key={assignee.id} className="px-0">
          <ListItemCard.Leading><UserAvatar size="sm" user={assignee} /></ListItemCard.Leading>
          <ListItemCard.Content>
            <ListItemCard.Title>{assignee.name} {assignee.surname}</ListItemCard.Title>
            {assignee.duty ? <ListItemCard.Subtitle>{assignee.duty}</ListItemCard.Subtitle> : null}
          </ListItemCard.Content>
          <ListItemCard.Trailing className="@max-[36rem]/row:basis-auto @max-[36rem]/row:justify-end">
            <Button.Icon
              aria-label={`Remove ${assignee.name} ${assignee.surname}`}
              icon={<X />}
              variant="ghost"
              size="sm"
              data-user-id={assignee.id}
              onClick={handleRemove}
            />
          </ListItemCard.Trailing>
        </ListItemCard.Root>
      ))}
    </div>
  );
}
