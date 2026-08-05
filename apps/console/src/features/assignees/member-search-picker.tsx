import { UserAvatar } from "@moc/ui/components/display/user-avatar";
import { Label, Paragraph } from "@moc/ui/components/display/text";
import { Combobox } from "@moc/ui/components/form/combobox";
import { Spinner } from "@moc/ui/components/feedback/spinner";
import { type ResolvedAssignee } from "@/data/fetch-assignees";
import type { User } from "@moc/types/requests";
import { cn } from "@moc/utils/cn";
import { useMembers } from "./use-members";
import { AssignedMemberList } from "./assigned-member-list";

type MemberSearchPickerProps = {
    assignees: ResolvedAssignee[];
    onAdd: (user: User) => void;
    onRemove: (userId: string) => void;
    placeholder?: string;
    emptyLabel?: string;
    className?: string;
};

export function MemberSearchPicker({
    assignees,
    onAdd,
    onRemove,
    placeholder = "Search members…",
    emptyLabel = "No assignees yet",
    className,
}: MemberSearchPickerProps) {
    const { members, isLoading } = useMembers();

    const assignedIds = new Set(assignees.map((a) => a.id));
    const available = members.filter((user) => !assignedIds.has(user.id));

    function handleSelect(user: User | null) {
        if (!user) return;
        onAdd(user);
    }

    function userToSearchLabel(user: User) {
        return `${user.name} ${user.surname} ${user.email}`;
    }

    return (
        <div className={cn("flex flex-col gap-3", className)}>
            <Combobox.Root items={available} value={null} onValueChange={handleSelect} itemToStringLabel={userToSearchLabel}>
                <Combobox.Field placeholder={placeholder} disabled={isLoading} />
                <Combobox.Content empty={isLoading ? <Spinner size="sm" /> : "No members found"} searchPlaceholder="Search members" title="Choose a member" className="max-h-64">
                    {available.map((user) => (
                        <Combobox.Item key={user.id} value={user}>
                            <span className="flex min-w-0 items-center gap-2">
                                <UserAvatar size="sm" user={user} />
                                <span className="min-w-0 flex-1">
                                    <Label.sm>{user.name} {user.surname}</Label.sm>
                                    <Paragraph.xs className="truncate text-quaternary">{user.currentDuty ?? user.email}</Paragraph.xs>
                                </span>
                            </span>
                        </Combobox.Item>
                    ))}
                </Combobox.Content>
            </Combobox.Root>

            <AssignedMemberList assignees={assignees} onRemove={onRemove} emptyLabel={emptyLabel} />
        </div>
    );
}
