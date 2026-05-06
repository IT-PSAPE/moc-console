import { Button } from "@/components/controls/button";
import { Avatar } from "@/components/display/avatar";
import { Label, Paragraph } from "@/components/display/text";
import { Input } from "@/components/form/input";
import { Radio } from "@/components/form/radio";
import { Popover } from "@/components/overlays/popover";
import { fetchAllUsers, type ResolvedAssignee } from "@/data/fetch-assignees";
import type { User } from "@/types/requests";
import { Spinner } from "@/components/feedback/spinner";
import { ArrowLeft, Search, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

type MemberPickerProps = {
    assignees: ResolvedAssignee[];
    duties: readonly string[];
    onAdd: (userId: string, duty: string) => void;
    onRemove: (userId: string) => void;
    children: ReactNode;
    placement?: 'bottom' | 'bottom-start' | 'bottom-end' | 'top' | 'top-start' | 'top-end';
};

export function MemberPicker({ assignees, duties, onAdd, onRemove, children, placement = 'bottom-end' }: MemberPickerProps) {
    return (
        <Popover placement={placement}>
            <Popover.Trigger>{children}</Popover.Trigger>
            <Popover.Panel className="w-72">
                <MemberPickerPanel assignees={assignees} duties={duties} onAdd={onAdd} onRemove={onRemove} />
            </Popover.Panel>
        </Popover>
    );
}

type Step = 'browse' | 'pick-duty';

type PanelProps = Omit<MemberPickerProps, 'children' | 'placement'>;

function MemberPickerPanel({ assignees, duties, onAdd, onRemove }: PanelProps) {
    const [step, setStep] = useState<Step>('browse');
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [search, setSearch] = useState("");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [duty, setDuty] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchAllUsers()
            .then(setAllUsers)
            .finally(() => setIsLoading(false));
    }, []);

    const matchesSearch = (name: string, surname: string) => {
        const fullName = `${name} ${surname}`.toLowerCase();
        return fullName.includes(search.toLowerCase());
    };

    const assignedIds = new Set(assignees.map((a) => a.id));
    const assignedFiltered = assignees.filter((a) => matchesSearch(a.name, a.surname));
    const available = allUsers.filter((u) => !assignedIds.has(u.id) && matchesSearch(u.name, u.surname));

    function handleSelectMember(user: User) {
        setSelectedUser(user);
        setDuty("");
        setStep('pick-duty');
    }

    function handleConfirm() {
        if (!selectedUser || !duty) return;
        onAdd(selectedUser.id, duty);
        setStep('browse');
        setSelectedUser(null);
        setDuty("");
        setSearch("");
    }

    function handleBack() {
        setStep('browse');
        setSelectedUser(null);
        setDuty("");
    }

    if (step === 'pick-duty' && selectedUser) {
        return (
            <>
                <div className="p-2 border-b border-secondary flex items-center gap-2">
                    <Button.Icon variant="ghost" icon={<ArrowLeft />} onClick={handleBack} />
                    <Avatar.initials size="sm" name={`${selectedUser.name[0]}${selectedUser.surname[0]}`} />
                    <div className="flex-1 min-w-0">
                        <Label.sm>{selectedUser.name} {selectedUser.surname}</Label.sm>
                    </div>
                </div>
                <div className="py-2 border-b border-secondary">
                    <Paragraph.xs className="px-3 pb-1.5 text-quaternary">Select a duty</Paragraph.xs>
                    <div className="max-h-40 px-1 overflow-y-auto space-y-0.5">
                        {duties.map((role) => (
                            <button key={role} type="button" className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-secondary transition-colors cursor-pointer" onClick={() => setDuty(role)}>
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
                    <Button variant="secondary" className="flex-1" onClick={handleBack}>Back</Button>
                    <Button className="flex-1" disabled={!duty} onClick={handleConfirm}>Add</Button>
                </div>
            </>
        );
    }

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
            <div className="max-h-72 overflow-y-auto">
                {isLoading && (
                    <div className="flex justify-center py-4">
                        <Spinner size="sm" />
                    </div>
                )}

                {!isLoading && assignedFiltered.length > 0 && (
                    <div>
                        <Paragraph.xs className="px-3 pt-2 pb-1 text-quaternary">Assigned</Paragraph.xs>
                        <div className="px-1 pb-1 flex flex-col gap-0.5">
                            {assignedFiltered.map((a) => (
                                <div key={`${a.id}-${a.duty}`} className="w-full flex items-center rounded-lg py-1 px-2 space-x-2">
                                    <Avatar.initials size="sm" name={`${a.name[0]}${a.surname[0]}`} />
                                    <div className="flex-1 min-w-0">
                                        <Label.sm>{a.name} {a.surname}</Label.sm>
                                        {a.duty && <Paragraph.xs className="text-quaternary truncate">{a.duty}</Paragraph.xs>}
                                    </div>
                                    <Button.Icon icon={<X />} variant="ghost" onClick={() => onRemove(a.id)} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {!isLoading && available.length > 0 && (
                    <div className={assignedFiltered.length > 0 ? "border-t border-secondary" : undefined}>
                        <Paragraph.xs className="px-3 pt-2 pb-1 text-quaternary">
                            {assignedFiltered.length > 0 ? 'Available' : 'Members'}
                        </Paragraph.xs>
                        <div className="px-1 pb-1 flex flex-col gap-0.5">
                            {available.map((a) => (
                                <button key={a.id} type="button" onClick={() => handleSelectMember(a)} className="w-full flex items-center rounded-lg py-1 px-2 space-x-2 hover:bg-secondary transition-colors cursor-pointer">
                                    <Avatar.initials size="sm" name={`${a.name[0]}${a.surname[0]}`} />
                                    <div className="flex-1 min-w-0 text-left">
                                        <Label.sm>{a.name} {a.surname}</Label.sm>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {!isLoading && assignedFiltered.length === 0 && available.length === 0 && (
                    <div className="px-3 py-4 text-center">
                        <Paragraph.sm className="text-quaternary">No members found</Paragraph.sm>
                    </div>
                )}
            </div>
        </>
    );
}
