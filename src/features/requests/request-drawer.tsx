import { Drawer, useDrawer } from "@/components/overlays/drawer";
import { Dropdown } from "@/components/overlays/dropdown";
import { Badge } from "@/components/display/badge";
import { Button } from "@/components/controls/button";
import { Divider } from "@/components/display/divider";
import { Label, Paragraph, Title } from "@/components/display/text";
import { fetchAssigneesByRequestId, type ResolvedAssignee } from "@/data/fetch-assignees";
import type { Request } from "@/types/requests";
import {
    Archive,
    ArchiveRestore,
    Calendar,
    Clock,
    Dot,
    EllipsisVertical,
    Maximize2,
    Pencil,
    Trash2,
    UserPlus,
    Users,
    X,
} from "lucide-react";
import { useEffect, useState } from "react";

const statusLabel: Record<Request["status"], string> = {
    not_started: "Not Started",
    in_progress: "In Progress",
    completed: "Completed",
    archived: "Archived",
};

const priorityColor = {
    urgent: "red",
    high: "yellow",
    medium: "blue",
    low: "gray",
} as const;

const categoryLabel: Record<Request["category"], string> = {
    video_production: "Video Production",
    video_shooting: "Video Shooting",
    graphic_design: "Graphic Design",
    event: "Event",
    education: "Education",
};

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function RequestDrawer({ request }: { request: Request }) {
    return (
        <Drawer.Portal>
            <Drawer.Backdrop />
            <Drawer.Panel>
                <RequestDrawerContent request={request} />
            </Drawer.Panel>
        </Drawer.Portal>
    );
}

function RequestDrawerContent({ request }: { request: Request }) {
    const { state } = useDrawer();
    const [assignees, setAssignees] = useState<ResolvedAssignee[]>([]);

    useEffect(() => {
        if (!state.isOpen) return;
        fetchAssigneesByRequestId(request.id).then(setAssignees);
    }, [state.isOpen, request.id]);

    return (
        <>
            {/* Toolbar */}
            <Drawer.Header className="flex items-center gap-1">
                <Drawer.Close>
                    <Button variant="ghost" icon={<X />} iconOnly />
                </Drawer.Close>
                <Button variant="ghost" icon={<Maximize2 />} iconOnly />
                <div className="flex-1" />
                <Dropdown.Root placement="bottom">
                    <Dropdown.Trigger>
                        <Button variant="ghost" icon={<EllipsisVertical />} iconOnly />
                    </Dropdown.Trigger>
                    <Dropdown.Panel>
                        <Dropdown.Item onSelect={() => {}}>
                            <Pencil className="size-4" />
                            Edit
                        </Dropdown.Item>
                        <Dropdown.Item onSelect={() => {}}>
                            {request.status === "archived" ? (
                                <><ArchiveRestore className="size-4" />Unarchive</>
                            ) : (
                                <><Archive className="size-4" />Archive</>
                            )}
                        </Dropdown.Item>
                        <Dropdown.Separator />
                        <Dropdown.Item onSelect={() => {}}>
                            <Trash2 className="size-4 text-utility-red-600" />
                            <span className="text-utility-red-600">Delete</span>
                        </Dropdown.Item>
                    </Dropdown.Panel>
                </Dropdown.Root>
            </Drawer.Header>

            <Drawer.Content>
                {/* Title */}
                <div className="px-4 pb-4">
                    <Title.h6>{request.title}</Title.h6>
                </div>

                {/* Meta fields */}
                <div className="px-4 space-y-3">
                    <MetaRow icon={<Dot />} label="Status">
                        <Badge label={statusLabel[request.status]} variant="outline" />
                    </MetaRow>
                    <MetaRow icon={<Dot />} label="Priority">
                        <Badge
                            label={request.priority.charAt(0).toUpperCase() + request.priority.slice(1)}
                            icon={<Dot />}
                            color={priorityColor[request.priority]}
                        />
                    </MetaRow>
                    <MetaRow icon={<Dot />} label="Type">
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
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {assignees.map((a) => (
                                    <Badge key={a.id} label={`${a.name} ${a.surname}`} variant="outline" />
                                ))}
                                <button className="flex items-center gap-1 text-tertiary hover:text-primary transition-colors cursor-pointer">
                                    <UserPlus className="size-3.5" />
                                    <Label.xs>Add</Label.xs>
                                </button>
                            </div>
                        ) : (
                            <button className="flex items-center gap-1 text-tertiary hover:text-primary transition-colors cursor-pointer">
                                <UserPlus className="size-3.5" />
                                <Label.xs>Add Member</Label.xs>
                            </button>
                        )}
                    </MetaRow>
                </div>

                <Divider className="px-4 py-6" />

                {/* 5Ws and 1H */}
                <div className="px-4 space-y-3">
                    <Label.md>5Ws and 1H</Label.md>
                    <FiveWRow label="Who" value={request.who} />
                    <FiveWRow label="What" value={request.what} />
                    <FiveWRow label="When" value={request.when} />
                    <FiveWRow label="Where" value={request.where} />
                    <FiveWRow label="Why" value={request.why} />
                    <FiveWRow label="How" value={request.how} />
                </div>

                {/* Notes */}
                {request.notes && (
                    <>
                        <Divider className="px-4 py-6" />
                        <div className="px-4 space-y-2">
                            <Label.md>Notes</Label.md>
                            <Paragraph.sm className="text-tertiary">{request.notes}</Paragraph.sm>
                        </div>
                    </>
                )}

                {/* Flow */}
                {request.flow && (
                    <>
                        <Divider className="px-4 py-6" />
                        <div className="px-4 space-y-2">
                            <Label.md>Flow</Label.md>
                            <Paragraph.sm className="text-tertiary">{request.flow}</Paragraph.sm>
                        </div>
                    </>
                )}

                {/* Assignee details */}
                {assignees.length > 0 && (
                    <>
                        <Divider className="px-4 py-6" />
                        <div className="px-4 space-y-3">
                            <Label.md>Assigned Members</Label.md>
                            {assignees.map((a) => (
                                <div
                                    key={a.id}
                                    className="flex items-center justify-between rounded-lg border border-secondary px-3 py-2"
                                >
                                    <div>
                                        <Label.sm>{a.name} {a.surname}</Label.sm>
                                        <Paragraph.xs className="text-tertiary">{a.role}</Paragraph.xs>
                                    </div>
                                    <Badge label={a.duty} variant="outline" />
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </Drawer.Content>
        </>
    );
}

function MetaRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
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

function FiveWRow({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <Label.sm className="text-primary">{label}: </Label.sm>
            <Paragraph.sm className="text-tertiary inline">{value}</Paragraph.sm>
        </div>
    );
}
