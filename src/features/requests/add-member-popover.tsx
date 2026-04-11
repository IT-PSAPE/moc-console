import { Button } from "@/components/controls/button";
import { Avatar } from "@/components/display/avatar";
import { cn } from "@/utils/cn";
import { Label, Paragraph } from "@/components/display/text";
import { Input } from "@/components/form/input";
import { Radio } from "@/components/form/radio";
import { Popover, usePopover } from "@/components/overlays/popover";
import { fetchAllUsers } from "@/data/fetch-assignees";
import { fetchRoles } from "@/data/fetch-roles";
import type { User } from "@/types/requests";
import { Spinner } from "@/components/feedback/spinner";
import { Check, Search } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

type AddMemberPopoverProps = {
    existingUserIds: string[];
    onAdd: (assigneeId: string, duty: string) => void;
    children: ReactNode;
};

export function AddMemberPopover({ existingUserIds, onAdd, children }: AddMemberPopoverProps) {
    return (
        <Popover.Root placement="bottom">
            <Popover.Trigger>{children}</Popover.Trigger>
            <Popover.Panel className="w-72">
                <AddMemberPanel existingUserIds={existingUserIds} onAdd={onAdd} />
            </Popover.Panel>
        </Popover.Root>
    );
}

type Step = "select-member" | "select-role";

function AddMemberPanel({ existingUserIds, onAdd }: Omit<AddMemberPopoverProps, "children">) {
    const { actions } = usePopover();
    const [step, setStep] = useState<Step>("select-member");
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<string[]>([]);
    const [search, setSearch] = useState("");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [duty, setDuty] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        Promise.all([fetchAllUsers(), fetchRoles()])
            .then(([users, fetchedRoles]) => {
                setAllUsers(users);
                setRoles(fetchedRoles);
            })
            .finally(() => setIsLoading(false));
    }, []);

    const filtered = allUsers.filter((a) => {
        const fullName = `${a.name} ${a.surname}`.toLowerCase();
        return fullName.includes(search.toLowerCase());
    });

    function handleSelectUser(assignee: User) {
        setSelectedUser(assignee);
        setSearch("");
        setStep("select-role");
    }

    function handleSelectRole(role: string) {
        setDuty(role);
    }

    function handleConfirm() {
        if (!selectedUser || !duty) return;
        onAdd(selectedUser.id, duty);
        actions.close();
        setStep("select-member");
        setSelectedUser(null);
        setDuty("");
        setSearch("");
    }

    if (step === "select-member") {
        return (
            <>
                <div className="p-2 border-b border-secondary">
                    <Input
                        icon={<Search />}
                        placeholder="Search members..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="max-h-56 overflow-y-auto p-1 flex flex-col gap-0.5">
                    {isLoading && (
                        <div className="flex justify-center py-4">
                            <Spinner size="sm" />
                        </div>
                    )}
                    {!isLoading && filtered.length === 0 && (
                        <div className="px-3 py-4 text-center">
                            <Paragraph.sm className="text-quaternary">No members found</Paragraph.sm>
                        </div>
                    )}
                    {!isLoading && filtered.map((a) => {
                        const alreadyAssigned = existingUserIds.includes(a.id);
                        return (
                            <button key={a.id} type="button" disabled={alreadyAssigned} onClick={() => handleSelectUser(a)} className={cn("w-full flex items-center rounded-lg py-1 px-2 space-x-2 hover:bg-secondary transition-colors cursor-pointer", alreadyAssigned && "opacity-50 !cursor-not-allowed hover:!bg-transparent")}>
                                <Avatar.initials size="sm" name={`${a.name[0]}${a.surname[0]}`} />
                                <div className="flex-1 min-w-0 text-left">
                                    <Label.sm>{a.name} {a.surname}</Label.sm>
                                </div>
                                {alreadyAssigned && <Check className="size-4 text-brand_secondary shrink-0" />}
                            </button>
                        );
                    })}
                </div>
            </>
        );
    }

    return (
        <>
            <div className="p-1 border-b border-secondary">
                <div className="w-full flex items-center rounded-lg py-1 space-x-2">
                    <Avatar.initials size="sm" name={`${selectedUser!.name[0]}${selectedUser!.surname[0]}`} />
                    <div className="flex-1 min-w-0">
                        <Label.sm>{selectedUser!.name} {selectedUser!.surname}</Label.sm>
                    </div>
                </div>
            </div>
            <div className="py-2 border-b border-secondary">
                <Paragraph.xs className="px-3 pb-1.5 text-quaternary">Select a duty</Paragraph.xs>
                <div className="max-h-40 px-1 overflow-y-auto space-y-0.5">
                    {roles.map((role) => (
                        <button key={role} type="button" className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-secondary transition-colors cursor-pointer" onClick={() => handleSelectRole(role)}>
                            <Radio value={role} checked={duty === role} />
                            <Label.sm className={duty === role ? "text-primary" : "text-secondary"}>{role}</Label.sm>
                        </button>
                    ))}
                </div>
            </div>
            <div className="p-2 border-b border-secondary">
                <Paragraph.xs className="px-1 pb-1.5 text-quaternary">Or type a custom duty</Paragraph.xs>
                <Input
                    placeholder="e.g. Camera 1 — main"
                    value={duty}
                    onChange={(e) => setDuty(e.target.value)}
                />
            </div>
            <div className="p-2 flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => { setStep("select-member"); setSelectedUser(null); setDuty(""); }}>
                    Back
                </Button>
                <Button className="flex-1" disabled={!duty} onClick={handleConfirm}>
                    Add
                </Button>
            </div>
        </>
    );
}
