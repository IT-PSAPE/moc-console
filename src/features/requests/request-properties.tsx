import { Badge } from "@/components/display/badge";
import { Label, Paragraph } from "@/components/display/text";
import { Dropdown } from "@/components/overlays/dropdown";

import type { ResolvedAssignee } from "@/data/fetch-assignees";
import type { Request, Status, Priority, Category } from "@/types/requests";
import { statusLabel, priorityLabel, categoryLabel, priorityColor } from "@/types/requests";
import { Calendar, Check, CircleAlert, CircleChevronDown, Clock, Loader, Plus, Tag, Users, X } from "lucide-react";
import { AddMemberPopover } from "./add-member-popover";
import { cn } from "@/utils/cn";
import { MemberItem } from "@/components/display/member-item";

function toLocalDateTimeValue(iso: string) {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
            <div className="min-h-6 flex-1 flex items-center gap-2 w-40 shrink-0 text-tertiary">
                <span className="*:size-4">{icon}</span>
                <Label.xs className="text-tertiary truncate w-full">{label}</Label.xs>
            </div>
            <div className="min-h-6 flex-2 flex items-center flex-1">{children}</div>
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

// ─── Options ────────────────────────────────────────────

const editableStatuses: Status[] = ["not_started", "in_progress", "completed"];
const allPriorities: Priority[] = ["low", "medium", "high", "urgent"];
const allCategories: Category[] = ["video_production", "video_shooting", "graphic_design", "event", "education"];

// ─── Composed sections ──────────────────────────────────

type RequestMetaFieldsProps = {
    request: Request;
    assignees: ResolvedAssignee[];
    onAddMember?: (assigneeId: string, duty: string) => void;
    editable?: boolean;
    onFieldChange?: <K extends keyof Request>(field: K, value: Request[K]) => void;
};

export function RequestMetaFields({ request, assignees, onAddMember, editable = false, onFieldChange }: RequestMetaFieldsProps) {
    return (
        <div className="space-y-3">
            {/* Status */}
            <MetaRow icon={<Loader />} label="Status">
                {editable && onFieldChange ? (
                    <Dropdown.Root placement="bottom">
                        <Dropdown.Trigger>
                            <Badge label={statusLabel[request.status]} variant="outline" className="cursor-pointer" />
                        </Dropdown.Trigger>
                        <Dropdown.Panel>
                            {editableStatuses.map((s) => (
                                <Dropdown.Item key={s} onSelect={() => onFieldChange("status", s)}>
                                    <span className="size-4 shrink-0 flex items-center justify-center">
                                        {s === request.status && <Check className="size-3.5 text-brand_secondary" />}
                                    </span>
                                    {statusLabel[s]}
                                </Dropdown.Item>
                            ))}
                        </Dropdown.Panel>
                    </Dropdown.Root>
                ) : (
                    <Badge label={statusLabel[request.status]} variant="outline" />
                )}
            </MetaRow>

            {/* Priority */}
            <MetaRow icon={<CircleChevronDown />} label="Priority">
                {editable && onFieldChange ? (
                    <Dropdown.Root placement="bottom">
                        <Dropdown.Trigger>
                            <Badge
                                label={request.priority.charAt(0).toUpperCase() + request.priority.slice(1)}
                                icon={<CircleAlert />}
                                color={priorityColor[request.priority]}
                                className="cursor-pointer"
                            />
                        </Dropdown.Trigger>
                        <Dropdown.Panel>
                            {allPriorities.map((p) => (
                                <Dropdown.Item key={p} onSelect={() => onFieldChange("priority", p)}>
                                    <span className="size-4 shrink-0 flex items-center justify-center">
                                        {p === request.priority && <Check className="size-3.5 text-brand_secondary" />}
                                    </span>
                                    {priorityLabel[p]}
                                </Dropdown.Item>
                            ))}
                        </Dropdown.Panel>
                    </Dropdown.Root>
                ) : (
                    <Badge
                        label={request.priority.charAt(0).toUpperCase() + request.priority.slice(1)}
                        icon={<CircleAlert />}
                        color={priorityColor[request.priority]}
                    />
                )}
            </MetaRow>

            {/* Type / Category */}
            <MetaRow icon={<Tag />} label="Type">
                {editable && onFieldChange ? (
                    <Dropdown.Root placement="bottom">
                        <Dropdown.Trigger>
                            <Badge label={categoryLabel[request.category]} icon={<Tag />} color="purple" className="cursor-pointer" />
                        </Dropdown.Trigger>
                        <Dropdown.Panel>
                            {allCategories.map((c) => (
                                <Dropdown.Item key={c} onSelect={() => onFieldChange("category", c)}>
                                    <span className="size-4 shrink-0 flex items-center justify-center">
                                        {c === request.category && <Check className="size-3.5 text-brand_secondary" />}
                                    </span>
                                    {categoryLabel[c]}
                                </Dropdown.Item>
                            ))}
                        </Dropdown.Panel>
                    </Dropdown.Root>
                ) : (
                    <Badge label={categoryLabel[request.category]} icon={<Tag />} color="purple" />
                )}
            </MetaRow>

            {/* Due Date */}
            <MetaRow icon={<Calendar className="size-4" />} label="Due Date">
                {editable && onFieldChange ? (
                    <input
                        type="datetime-local"
                        value={request.dueDate ? toLocalDateTimeValue(request.dueDate) : ""}
                        onChange={(e) => {
                            const v = e.target.value;
                            onFieldChange("dueDate", v ? new Date(v).toISOString() : null);
                        }}
                        className="bg-transparent text-xs text-primary outline-none cursor-pointer"
                    />
                ) : (
                    request.dueDate ? (
                        <Paragraph.sm>{formatDate(request.dueDate)}</Paragraph.sm>
                    ) : (
                        <Paragraph.sm className="text-quaternary">No due date</Paragraph.sm>
                    )
                )}
            </MetaRow>

            {/* Created time (always read-only) */}
            <MetaRow icon={<Clock className="size-4" />} label="Created time">
                <Paragraph.sm>{formatDate(request.createdAt)}</Paragraph.sm>
            </MetaRow>

            {/* Assigned Members */}
            <MetaRow icon={<Users className="size-4" />} label="Assigee">
                {assignees.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                        {assignees.map((a) => (
                            <MemberItem name={a.name} surname={a.surname} size='sm' className="!w-fit" >
                                <X className="size-4" />
                            </MemberItem>
                        ))}
                        {onAddMember && (
                            <AddMemberPopover existingAssigneeIds={assignees.map(a => a.id)} onAdd={onAddMember}>
                                <button className="cursor-pointer">
                                    <Badge label="Add member" icon={<Plus />} />
                                </button>
                            </AddMemberPopover>
                        )}
                    </div>
                ) : (
                    onAddMember ? (
                        <AddMemberPopover existingAssigneeIds={[]} onAdd={onAddMember}>
                            <button className="cursor-pointer">
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
            <Label.md className="block pb-3">Assignee</Label.md>
            <div className="space-y-3">
                {assignees.map((a) => (
                    <MemberItem name={a.name} surname={a.surname} duty={a.duty} size="bg" />
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
