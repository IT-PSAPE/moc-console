import { Button } from "@/components/controls/button";
import { Label, Paragraph } from "@/components/display/text";
import { Input } from "@/components/form/input";
import { Popover, usePopover } from "@/components/overlays/popover";
import { fetchAllAssignees } from "@/data/fetch-assignees";
import { fetchRoles } from "@/data/fetch-roles";
import type { Assignee } from "@/types/requests";
import { Check, Search } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

type AddMemberPopoverProps = {
    existingAssigneeIds: string[];
    onAdd: (assigneeId: string, duty: string) => void;
    children: ReactNode;
};

export function AddMemberPopover({ existingAssigneeIds, onAdd, children }: AddMemberPopoverProps) {
    return (
        <Popover.Root placement="bottom">
            <Popover.Trigger>{children}</Popover.Trigger>
            <Popover.Panel className="w-72">
                <AddMemberPanel existingAssigneeIds={existingAssigneeIds} onAdd={onAdd} />
            </Popover.Panel>
        </Popover.Root>
    );
}

type Step = "select-member" | "select-role";

function AddMemberPanel({ existingAssigneeIds, onAdd }: Omit<AddMemberPopoverProps, "children">) {
    const { actions } = usePopover();
    const [step, setStep] = useState<Step>("select-member");
    const [allAssignees, setAllAssignees] = useState<Assignee[]>([]);
    const [roles, setRoles] = useState<string[]>([]);
    const [search, setSearch] = useState("");
    const [selectedAssignee, setSelectedAssignee] = useState<Assignee | null>(null);
    const [duty, setDuty] = useState("");

    useEffect(() => {
        fetchAllAssignees().then(setAllAssignees);
        fetchRoles().then(setRoles);
    }, []);

    const filtered = allAssignees.filter((a) => {
        const fullName = `${a.name} ${a.surname}`.toLowerCase();
        return fullName.includes(search.toLowerCase());
    });

    function handleSelectAssignee(assignee: Assignee) {
        setSelectedAssignee(assignee);
        setSearch("");
        setStep("select-role");
    }

    function handleSelectRole(role: string) {
        setDuty(role);
    }

    function handleConfirm() {
        if (!selectedAssignee || !duty) return;
        onAdd(selectedAssignee.id, duty);
        actions.close();
        setStep("select-member");
        setSelectedAssignee(null);
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
                <div className="max-h-56 overflow-y-auto p-1">
                    {filtered.length === 0 && (
                        <div className="px-3 py-4 text-center">
                            <Paragraph.sm className="text-quaternary">No members found</Paragraph.sm>
                        </div>
                    )}
                    {filtered.map((a) => {
                        const alreadyAssigned = existingAssigneeIds.includes(a.id);
                        return (
                            <button
                                key={a.id}
                                type="button"
                                disabled={alreadyAssigned}
                                className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                onClick={() => handleSelectAssignee(a)}
                            >
                                <div className="size-8 shrink-0 rounded-full bg-brand_primary flex items-center justify-center">
                                    <Label.xs className="text-brand_secondary">{a.name[0]}{a.surname[0]}</Label.xs>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <Label.sm>{a.name} {a.surname}</Label.sm>
                                    <Paragraph.xs className="text-tertiary">{a.role}</Paragraph.xs>
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
            <div className="p-3 border-b border-secondary">
                <div className="flex items-center gap-2">
                    <div className="size-8 shrink-0 rounded-full bg-brand_primary flex items-center justify-center">
                        <Label.xs className="text-brand_secondary">
                            {selectedAssignee?.name[0]}{selectedAssignee?.surname[0]}
                        </Label.xs>
                    </div>
                    <div>
                        <Label.sm>{selectedAssignee?.name} {selectedAssignee?.surname}</Label.sm>
                        <Paragraph.xs className="text-tertiary">{selectedAssignee?.role}</Paragraph.xs>
                    </div>
                </div>
            </div>
            <div className="p-2 border-b border-secondary">
                <Paragraph.xs className="px-1 pb-1.5 text-quaternary">Select a duty</Paragraph.xs>
                <div className="max-h-40 overflow-y-auto space-y-0.5">
                    {roles.map((role) => (
                        <button
                            key={role}
                            type="button"
                            className="w-full flex items-center gap-2 rounded-lg px-3 py-1.5 text-left hover:bg-secondary transition-colors cursor-pointer"
                            onClick={() => handleSelectRole(role)}
                        >
                            {duty === role ? (
                                <Check className="size-3.5 text-brand_secondary shrink-0" />
                            ) : (
                                <span className="size-3.5 shrink-0" />
                            )}
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
                <Button variant="secondary" className="flex-1" onClick={() => { setStep("select-member"); setSelectedAssignee(null); setDuty(""); }}>
                    Back
                </Button>
                <Button className="flex-1" disabled={!duty} onClick={handleConfirm}>
                    Add
                </Button>
            </div>
        </>
    );
}
