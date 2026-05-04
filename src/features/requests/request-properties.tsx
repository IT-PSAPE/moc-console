import { Badge } from "@/components/display/badge";
import { Label, Paragraph } from "@/components/display/text";
import { Dropdown } from "@/components/overlays/dropdown";

import type { ResolvedAssignee } from "@/data/fetch-assignees";
import type { Request, Status, Priority, Category } from "@/types/requests";
import { statusLabel, statusColor, priorityLabel, categoryLabel, priorityColor } from "@/types/requests";
import { Archive, Calendar, Check, CircleAlert, CircleChevronDown, CircleDashed, Clock, History, Loader, Plus, Tag, User, X } from "lucide-react";
import { AddMemberPopover } from "./add-member-popover";
import { cn } from "@/utils/cn";
import { Avatar } from "@/components/display/avatar";
import { Button } from "@/components/controls/button";
import { Input } from "@/components/form/input";
import { formatUtcIsoForBrowserDateTimeInput, formatUtcIsoInBrowserTimeZone, parseBrowserDateTimeInputToUtcIso } from "@/utils/browser-date-time";

export function formatDate(iso: string) {
    return formatUtcIsoInBrowserTimeZone(iso);
}

// ─── Primitives ─────────────────────────────────────────

import { MetaRow } from "@/components/display/meta-row";
export { MetaRow };

export function FiveWRow({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <Label.sm className="text-primary">{label}: </Label.sm>
            <Paragraph.sm className="text-tertiary inline">{value}</Paragraph.sm>
        </div>
    );
}

// ─── Options ────────────────────────────────────────────

const statusIcon: Record<Status, React.ReactNode> = {
    not_started: <CircleDashed />,
    in_progress: <Loader />,
    completed: <Check />,
    archived: <Archive />,
};

const editableStatuses: Status[] = ["not_started", "in_progress", "completed", "archived"];
const allPriorities: Priority[] = ["low", "medium", "high", "urgent"];
const allCategories: Category[] = ["video_production", "video_shooting", "graphic_design", "event", "education"];

// ─── Composed sections ──────────────────────────────────

type RequestMetaFieldsProps = {
    request: Request;
    editable?: boolean;
    onFieldChange?: <K extends keyof Request>(field: K, value: Request[K]) => void;
};

export function RequestMetaFields({ request, editable = false, onFieldChange }: RequestMetaFieldsProps) {
    return (
        <div className="space-y-3">
            {/* Status */}
            <MetaRow icon={<Loader />} label="Status">
                {editable && onFieldChange ? (
                    <Dropdown placement="bottom">
                        <Dropdown.Trigger>
                            <Badge label={statusLabel[request.status]} icon={statusIcon[request.status]} color={statusColor[request.status]} className="cursor-pointer" />
                        </Dropdown.Trigger>
                        <Dropdown.Panel>
                            {editableStatuses.map((s) => (
                                <Dropdown.Item key={s} onSelect={() => onFieldChange("status", s)} className="px-1">
                                    <Badge label={statusLabel[s]} icon={statusIcon[s]} color={statusColor[s]} />
                                </Dropdown.Item>
                            ))}
                        </Dropdown.Panel>
                    </Dropdown>
                ) : (
                    <Badge label={statusLabel[request.status]} icon={statusIcon[request.status]} color={statusColor[request.status]} />
                )}
            </MetaRow>

            {/* Priority */}
            <MetaRow icon={<CircleChevronDown />} label="Priority">
                {editable && onFieldChange ? (
                    <Dropdown placement="bottom">
                        <Dropdown.Trigger>
                            <Badge
                                label={request.priority.charAt(0).toUpperCase() + request.priority.slice(1)}
                                icon={<CircleAlert />}
                                color={priorityColor[request.priority]}
                                className="cursor-pointer"
                            />
                        </Dropdown.Trigger>
                        <Dropdown.Panel >
                            {allPriorities.map((p) => (
                                <Dropdown.Item key={p} onSelect={() => onFieldChange("priority", p)} className="px-1">
                                    <Badge label={priorityLabel[p]} icon={<CircleAlert />} color={priorityColor[p]} />
                                </Dropdown.Item>
                            ))}
                        </Dropdown.Panel>
                    </Dropdown>
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
                    <Dropdown placement="bottom">
                        <Dropdown.Trigger>
                            <Badge label={categoryLabel[request.category]} icon={<Tag />} color="purple" className="cursor-pointer" />
                        </Dropdown.Trigger>
                        <Dropdown.Panel>
                            {allCategories.map((c) => (
                                <Dropdown.Item key={c} onSelect={() => onFieldChange("category", c)} className="px-1">
                                    <Badge label={categoryLabel[c]} icon={<Tag />} color="purple"/>
                                </Dropdown.Item>
                            ))}
                        </Dropdown.Panel>
                    </Dropdown>
                ) : (
                    <Badge label={categoryLabel[request.category]} icon={<Tag />} color="purple" />
                )}
            </MetaRow>

            {/* Due Date */}
            <MetaRow icon={<Calendar className="size-4" />} label="Due Date">
                {editable && onFieldChange ? (
                    <Input
                        type="datetime-local"
                        value={formatUtcIsoForBrowserDateTimeInput(request.dueDate)}
                        onChange={(e) => {
                            const v = e.target.value;
                            if (!v) return;
                            onFieldChange("dueDate", parseBrowserDateTimeInputToUtcIso(v));
                        }}
                        required
                        style="ghost"
                    />
                ) : (
                    <Paragraph.sm>{formatDate(request.dueDate)}</Paragraph.sm>
                )}
            </MetaRow>

            {/* Requested by */}
            <MetaRow icon={<User className="size-4" />} label="Requested By">
                {editable && onFieldChange ? (
                    <Input
                        value={request.requestedBy}
                        onChange={(e) => onFieldChange("requestedBy", e.target.value)}
                        placeholder="Requester name"
                        className="max-w-48"
                        style="ghost"
                    />
                ) : (
                    request.requestedBy ? (
                        <Paragraph.sm>{request.requestedBy}</Paragraph.sm>
                    ) : (
                        <Paragraph.sm className="text-quaternary">No requester</Paragraph.sm>
                    )
                )}
            </MetaRow>

            {/* Created time (always read-only) */}
            <MetaRow icon={<Clock className="size-4" />} label="Created time">
                <Paragraph.sm>{formatDate(request.createdAt)}</Paragraph.sm>
            </MetaRow>

            <MetaRow icon={<History className="size-4" />} label="Last updated">
                <Paragraph.sm>{formatDate(request.updatedAt)}</Paragraph.sm>
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

type RequestAssigneeListProps = {
    assignees: ResolvedAssignee[];
    onAddMember?: (userId: string, duty: string) => void;
    onRemoveMember?: (userId: string) => void;
    className?: string;
};

export function RequestAssigneeList({ assignees, onAddMember, onRemoveMember, className }: RequestAssigneeListProps) {
    return (
        <div className={cn(className)}>
            <div className="flex items-center justify-between pb-3">
                <Label.md>Assignees</Label.md>
                {onAddMember && (
                    <AddMemberPopover existingUserIds={assignees.map(a => a.id)} onAdd={onAddMember}>
                        <Button.Icon icon={<Plus />} variant="ghost" className="cursor-pointer" />
                    </AddMemberPopover>
                )}
            </div>
            {assignees.length > 0 ? (
                <div className="space-y-3">
                    {assignees.map((a) => (
                        <div key={a.id} className="w-full flex items-center rounded-lg py-1 space-x-2">
                            <Avatar.initials size="md" name={`${a.name[0]}${a.surname[0]}`} />
                            <div className="flex-1 min-w-0">
                                <Label.sm>{a.name} {a.surname}</Label.sm>
                                {a.duty && <Paragraph.xs className="text-quaternary truncate">{a.duty}</Paragraph.xs>}
                            </div>
                            {onRemoveMember && <Button.Icon icon={<X />} variant="ghost" onClick={() => onRemoveMember(a.id)} />}
                        </div>
                    ))}
                </div>
            ) : (
                <Paragraph.sm className="text-quaternary">No assignees</Paragraph.sm>
            )}
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
