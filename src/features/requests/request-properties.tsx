import { Badge } from "@/components/display/badge";
import { Label, Paragraph } from "@/components/display/text";
import type { ResolvedAssignee } from "@/data/fetch-assignees";
import type { Request } from "@/types/requests";
import { Calendar, Clock, Dot, Plus, UserPlus, Users } from "lucide-react";

// ─── Label maps ─────────────────────────────────────────

export const statusLabel: Record<Request["status"], string> = {
    not_started: "Not Started",
    in_progress: "In Progress",
    completed: "Completed",
    archived: "Archived",
};

export const priorityColor = {
    urgent: "red",
    high: "yellow",
    medium: "blue",
    low: "gray",
} as const;

export const categoryLabel: Record<Request["category"], string> = {
    video_production: "Video Production",
    video_shooting: "Video Shooting",
    graphic_design: "Graphic Design",
    event: "Event",
    education: "Education",
};

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

export function RequestMetaFields({ request, assignees }: { request: Request; assignees: ResolvedAssignee[] }) {
    return (
        <div className="space-y-3">
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
                    <div className="flex flex-col gap-1.5">
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
                        <Badge label="Add member" icon={<Plus />} variant="outline" />
                    </button>
                )}
            </MetaRow>
        </div>
    );
}

export function RequestFiveW({ request }: { request: Request }) {
    return (
        <div className="space-y-3">
            <Label.md>5Ws and 1H</Label.md>
            <FiveWRow label="Who" value={request.who} />
            <FiveWRow label="What" value={request.what} />
            <FiveWRow label="When" value={request.when} />
            <FiveWRow label="Where" value={request.where} />
            <FiveWRow label="Why" value={request.why} />
            <FiveWRow label="How" value={request.how} />
        </div>
    );
}

export function RequestAssigneeList({ assignees }: { assignees: ResolvedAssignee[] }) {
    if (assignees.length === 0) return null;
    return (
        <div className="space-y-3">
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
    );
}

export function RequestNotes({ request }: { request: Request }) {
    if (!request.notes) return null;
    return (
        <div className="space-y-2">
            <Label.md>Notes</Label.md>
            <Paragraph.sm className="text-tertiary">{request.notes}</Paragraph.sm>
        </div>
    );
}

export function RequestFlow({ request }: { request: Request }) {
    if (!request.flow) return null;
    return (
        <div className="space-y-2">
            <Label.md>Flow</Label.md>
            <Paragraph.sm className="text-tertiary">{request.flow}</Paragraph.sm>
        </div>
    );
}
