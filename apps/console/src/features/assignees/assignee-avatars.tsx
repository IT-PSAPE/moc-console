import type { ResolvedAssignee } from "@/data/fetch-assignees";
import { AvatarGroup, type AvatarGroupItem } from "@moc/ui/components/display/avatar-group";

type AssigneeAvatarsProps = {
    assignees: ResolvedAssignee[];
    max?: number;
    size?: '2xs' | 'xs' | 'sm';
    className?: string;
};

function toAvatarGroupItems(assignees: ResolvedAssignee[]): AvatarGroupItem[] {
    return assignees.map((a) => ({
        key: a.id,
        initials: `${a.name[0]}${a.surname[0]}`,
        avatarUrl: a.avatarUrl,
        title: `${a.name} ${a.surname}`,
    }));
}

export function AssigneeAvatars({ assignees, max = 2, size = '2xs', className }: AssigneeAvatarsProps) {
    return (
        <AvatarGroup items={toAvatarGroupItems(assignees)} max={max} size={size} className={className} />
    );
}
