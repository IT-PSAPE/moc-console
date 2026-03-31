import { Badge } from "@/components/display/badge";
import { Label, Paragraph } from "@/components/display/text";
import type { ResolvedAssignee } from "@/data/fetch-assignees";
import type { Request } from "@/types/requests";
import { statusLabel, priorityColor, categoryLabel } from "@/types/requests";
import { Calendar, CircleChevronDown, Clock, Dot, Loader, Plus, Tag, UserPlus, Users } from "lucide-react";
import { AddMemberPopover } from "./add-member-popover";
import { cn } from "@/utils/cn";

export function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

// ─── Primitives ─────────────────────────────────────────

export function MetaRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3">
            <div className="min-h-6 flex items-center gap-2 w-40 shrink-0 text-tertiary">
                <span className="*:size-4">{icon}</span>
                <Label.sm className="text-tertiary">{label}</Label.sm>
            </div>
            <div className="min-h-6 flex items-center flex-1">{children}</div>
        </div>
    );
}

export function FiveWRow({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <Label.sm className="text-primary">{label}: </Label.sm>
            <Paragraph.sm className="text-tertiary inline">{value}</Paragraph.sm>
        </div>
    );
}

// ─── Composed sections ──────────────────────────────────

type RequestMetaFieldsProps = {
    request: Request;
    assignees: ResolvedAssignee[];
    onAddMember?: (assigneeId: string, duty: string) => void;
};

export function RequestMetaFields({ request, assignees, onAddMember }: RequestMetaFieldsProps) {
    return (
        <div className="space-y-3">
            <MetaRow icon={<Loader />} label="Status">
                <Badge label={statusLabel[request.status]} variant="outline" />
            </MetaRow>
            <MetaRow icon={<CircleChevronDown />} label="Priority">
                <Badge
                    label={request.priority.charAt(0).toUpperCase() + request.priority.slice(1)}
                    icon={<Dot />}
                    color={priorityColor[request.priority]}
                />
            </MetaRow>
            <MetaRow icon={<Tag />} label="Type">
                <Badge label={categoryLabel[request.category]} icon={<Dot />} color="purple" />
            </MetaRow>
            {request.dueDate && (
                <MetaRow icon={<Calendar className="size-4" />} label="Due Date">
                    <Paragraph.sm>{formatDate(request.dueDate)}</Paragraph.sm>
                </MetaRow>
            )}
            <MetaRow icon={<Clock className="size-4" />} label="Created time">
                <Paragraph.sm>{formatDate(request.createdAt)}</Paragraph.sm>
            </MetaRow>
            <MetaRow icon={<Users className="size-4" />} label="Assigned Members">
                {assignees.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                        {assignees.map((a) => (
                            <Badge key={a.id} label={`${a.name} ${a.surname}`} variant="outline" />
                        ))}
                        {onAddMember && (
                            <AddMemberPopover existingAssigneeIds={assignees.map(a => a.id)} onAdd={onAddMember}>
                                <button className="flex items-center gap-1 text-tertiary hover:text-primary transition-colors cursor-pointer">
                                    <UserPlus className="size-3.5" />
                                    <Label.xs>Add</Label.xs>
                                </button>
                            </AddMemberPopover>
                        )}
                    </div>
                ) : (
                    onAddMember ? (
                        <AddMemberPopover existingAssigneeIds={[]} onAdd={onAddMember}>
                            <button className="flex items-center gap-1 text-tertiary hover:text-primary transition-colors cursor-pointer">
                                <Badge label="Add member" icon={<Plus />} variant="outline" />
                            </button>
                        </AddMemberPopover>
                    ) : (
                        <Paragraph.sm className="text-quaternary">None</Paragraph.sm>
                    )
                )}
            </MetaRow>
        </div>
    );
}

export function RequestFiveW({ request, className }: { request: Request, className?: string }) {
    return (
        <div className={cn(className)}>
            <Label.md className="block pb-3">5Ws and 1H</Label.md>
            <div className="space-y-3">
                <FiveWRow label="Who" value={request.who} />
                <FiveWRow label="What" value={request.what} />
                <FiveWRow label="When" value={request.when} />
                <FiveWRow label="Where" value={request.where} />
                <FiveWRow label="Why" value={request.why} />
                <FiveWRow label="How" value={request.how} />
            </div>
        </div>
    );
}

export function RequestAssigneeList({ assignees, className }: { assignees: ResolvedAssignee[], className?: string }) {
    if (assignees.length === 0) return null;
    return (
        <div className={cn(className)}>
            <Label.md className="block pb-3">Assigned Members</Label.md>
            <div className="space-y-3">
                {assignees.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-lg border border-secondary px-3 py-2">
                        <div>
                            <Label.sm>{a.name} {a.surname}</Label.sm>
                            <Paragraph.xs className="text-tertiary">{a.role}</Paragraph.xs>
                        </div>
                        <Badge label={a.duty} variant="outline" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function RequestNotes({ request, className }: { request: Request, className?: string }) {
    if (!request.notes) return null;
    return (
        <div className={cn(className)}>
            <Label.md className="block pb-3">Notes</Label.md>
            <div className="space-y-3">
                <Paragraph.sm className="text-tertiary">{request.notes}</Paragraph.sm>
            </div>
        </div>
    );
}

export function RequestFlow({ request, className }: { request: Request, className?: string }) {
    if (!request.flow) return null;
    return (
        <div className={cn(className)}>
            <Label.md className="block pb-3">Flow</Label.md>
            <div className="space-y-3">
                <Paragraph.sm className="text-tertiary">{request.flow}</Paragraph.sm>
            </div>
        </div>
    );
}
