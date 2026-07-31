import { UserAvatar } from "@moc/ui/components/display/user-avatar";
import { Label, Paragraph } from "@moc/ui/components/display/text";
import { Combobox } from "@moc/ui/components/form/combobox";
import { Spinner } from "@moc/ui/components/feedback/spinner";
import { Button } from "@moc/ui/components/controls/button";
import { fetchAllUsers, type ResolvedAssignee } from "@/data/fetch-assignees";
import type { User } from "@moc/types/requests";
import { cn } from "@moc/utils/cn";
import { X } from "lucide-react";
import { useEffect, useState, type MouseEvent } from "react";

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
    placeholder = "Search members...",
    emptyLabel = "No assignees yet",
    className,
}: MemberSearchPickerProps) {
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchAllUsers()
            .then(setAllUsers)
            .finally(() => setIsLoading(false));
    }, []);

    const assignedIds = new Set(assignees.map((a) => a.id));
    const available = allUsers.filter((user) => !assignedIds.has(user.id));

    function handleSelect(user: User | null) {
        if (!user) return;
        onAdd(user);
    }

    function userToSearchLabel(user: User) {
        return `${user.name} ${user.surname} ${user.email}`;
    }

    function handleRemove(event: MouseEvent<HTMLButtonElement>) {
        const userId = event.currentTarget.dataset.userId;
        if (userId) onRemove(userId);
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

            {assignees.length > 0 ? (
                <div className="flex flex-col gap-2">
                    {assignees.map((a) => (
                        <div key={`${a.id}-${a.duty}`} className="flex items-center gap-2 rounded-lg py-1">
                            <UserAvatar size="sm" user={a} />
                            <div className="flex-1 min-w-0">
                                <Label.sm>{a.name} {a.surname}</Label.sm>
                                {a.duty && <Paragraph.xs className="text-quaternary truncate">{a.duty}</Paragraph.xs>}
                            </div>
                            <Button.Icon icon={<X />} variant="ghost" data-user-id={a.id} onClick={handleRemove} />
                        </div>
                    ))}
                </div>
            ) : (
                <Paragraph.sm className="text-quaternary">{emptyLabel}</Paragraph.sm>
            )}
        </div>
    );
}
