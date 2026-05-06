import { Avatar } from "@/components/display/avatar";
import { Label, Paragraph } from "@/components/display/text";
import { Input } from "@/components/form/input";
import { Spinner } from "@/components/feedback/spinner";
import { Button } from "@/components/controls/button";
import { AnchoredPanel } from "@/components/overlays/anchored-panel";
import { fetchAllUsers, type ResolvedAssignee } from "@/data/fetch-assignees";
import type { User } from "@/types/requests";
import { cn } from "@/utils/cn";
import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";

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
    const [search, setSearch] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [anchor, setAnchor] = useState<HTMLDivElement | null>(null);

    useEffect(() => {
        fetchAllUsers()
            .then(setAllUsers)
            .finally(() => setIsLoading(false));
    }, []);

    const assignedIds = new Set(assignees.map((a) => a.id));
    const matchesSearch = (user: User) => {
        if (!search.trim()) return true;
        const fullName = `${user.name} ${user.surname}`.toLowerCase();
        const email = user.email.toLowerCase();
        const query = search.toLowerCase();
        return fullName.includes(query) || email.includes(query);
    };

    const available = allUsers.filter((u) => !assignedIds.has(u.id) && matchesSearch(u));

    function handleSelect(user: User) {
        onAdd(user);
        setSearch("");
        setIsOpen(false);
    }

    return (
        <div className={cn("flex flex-col gap-3", className)}>
            <div ref={setAnchor}>
                <Input
                    icon={<Search />}
                    placeholder={placeholder}
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
                    onFocus={() => setIsOpen(true)}
                />
            </div>

            <AnchoredPanel
                anchor={anchor}
                open={isOpen}
                onClose={() => setIsOpen(false)}
                placement="bottom-start"
                matchAnchorWidth
                className="max-h-64"
            >
                {isLoading && (
                    <div className="flex justify-center py-4">
                        <Spinner size="sm" />
                    </div>
                )}
                {!isLoading && available.length === 0 && (
                    <div className="px-3 py-3 text-center">
                        <Paragraph.sm className="text-quaternary">No members found</Paragraph.sm>
                    </div>
                )}
                {!isLoading && available.map((user) => (
                    <button
                        key={user.id}
                        type="button"
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-secondary transition-colors cursor-pointer"
                        onMouseDown={(e) => { e.preventDefault(); handleSelect(user); }}
                    >
                        <Avatar.initials size="sm" name={`${user.name[0]}${user.surname[0]}`} />
                        <div className="flex-1 min-w-0">
                            <Label.sm>{user.name} {user.surname}</Label.sm>
                            <Paragraph.xs className="text-quaternary truncate">{user.email}</Paragraph.xs>
                        </div>
                    </button>
                ))}
            </AnchoredPanel>

            {assignees.length > 0 ? (
                <div className="flex flex-col gap-2">
                    {assignees.map((a) => (
                        <div key={`${a.id}-${a.duty}`} className="flex items-center gap-2 rounded-lg py-1">
                            <Avatar.initials size="sm" name={`${a.name[0]}${a.surname[0]}`} />
                            <div className="flex-1 min-w-0">
                                <Label.sm>{a.name} {a.surname}</Label.sm>
                                {a.duty && <Paragraph.xs className="text-quaternary truncate">{a.duty}</Paragraph.xs>}
                            </div>
                            <Button.Icon icon={<X />} variant="ghost" onClick={() => onRemove(a.id)} />
                        </div>
                    ))}
                </div>
            ) : (
                <Paragraph.sm className="text-quaternary">{emptyLabel}</Paragraph.sm>
            )}
        </div>
    );
}
