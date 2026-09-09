import type { Request, Status } from "@moc/types/requests";
import { statusGroups } from "@moc/types/requests";
import { updateRequestStatus } from "@/data/mutate-requests";
import { useKanbanStatusChange } from "@/hooks/use-kanban-status-change";
import { useRequests } from "./request-provider";

function getRequestStatus(request: Request) { return request.status; }
function setRequestStatus(request: Request, status: Status) { return { ...request, status, updatedAt: new Date().toISOString() }; }
function getRequestStatusLabel(status: Status) { return statusGroups.find((group) => group.key === status)?.label ?? status; }

export function useRequestKanbanStatusChange() {
    const { actions: { syncRequest } } = useRequests();

    return useKanbanStatusChange<Request, Status>({
        dataKey: "request",
        getStatus: getRequestStatus,
        setStatus: setRequestStatus,
        sync: syncRequest,
        persist: updateRequestStatus,
        statusLabel: getRequestStatusLabel,
        errorMessage: "The request status could not be updated.",
    });
}
