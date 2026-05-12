import { Indicator } from "@/components/display/indicator";
import { KanbanBoard } from "@/components/display/kanban-board";
import { RequestItem } from "./request-item";
import { Label } from "@/components/display/text";
import type { Request, Status } from "@/types/requests";
import { statusGroups } from "@/types/requests";
import { useRequests } from "./request-provider";
import { updateRequestStatus } from "@/data/mutate-requests";
import { useFeedback } from "@/components/feedback/feedback-provider";
import { type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { useState } from "react";
import { getErrorMessage } from "@/utils/get-error-message";

function DraggableRequestItem({ request }: { request: Request }) {
    const [drawerOpen, setDrawerOpen] = useState(false);
    return (
        <KanbanBoard.Item id={request.id} data={{ request }} disabled={drawerOpen}>
            <RequestItem request={request} vertical onDrawerOpenChange={setDrawerOpen} />
        </KanbanBoard.Item>
    );
}

export function RequestKanbanView({ requests }: { requests: Request[] }) {
    const { actions: { syncRequest } } = useRequests();
    const { toast } = useFeedback();
    const [activeRequest, setActiveRequest] = useState<Request | null>(null);

    function handleDragStart(event: DragStartEvent) {
        const req = event.active.data.current?.request as Request | undefined;
        setActiveRequest(req ?? null);
    }

    async function handleDragEnd(event: DragEndEvent) {
        setActiveRequest(null);

        const { active, over } = event;
        if (!over) return;

        const request = active.data.current?.request as Request | undefined;
        if (!request) return;

        const newStatus = over.id as Status;
        if (request.status === newStatus) return;

        const previousStatus = request.status;
        const updated = { ...request, status: newStatus, updatedAt: new Date().toISOString() };
        syncRequest(updated);

        try {
            await updateRequestStatus(request.id, newStatus);
            toast({ title: `Moved to ${statusGroups.find((g) => g.key === newStatus)?.label}`, variant: "success" });
        } catch (error) {
            syncRequest({ ...request, status: previousStatus });
            toast({ title: "Failed to update status", description: getErrorMessage(error, "The request status could not be updated."), variant: "error" });
        }
    }

    return (
        <KanbanBoard onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <KanbanBoard.Columns>
                {statusGroups.map((group) => {
                    const items = requests.filter((r) => r.status === group.key);
                    return (
                        <KanbanBoard.Column key={group.key} id={group.key}>
                            <KanbanBoard.ColumnHeader>
                                <Indicator color={group.color} className="size-6" />
                                <Label.sm>{group.label}</Label.sm>
                                <Label.sm className="text-quaternary ml-auto">{items.length}</Label.sm>
                            </KanbanBoard.ColumnHeader>
                            <KanbanBoard.ColumnContent>
                                {items.map((r) => (
                                    <DraggableRequestItem key={r.id} request={r} />
                                ))}
                            </KanbanBoard.ColumnContent>
                        </KanbanBoard.Column>
                    );
                })}
            </KanbanBoard.Columns>

            <KanbanBoard.Overlay>
                {activeRequest && <RequestItem request={activeRequest} vertical />}
            </KanbanBoard.Overlay>
        </KanbanBoard>
    );
}
