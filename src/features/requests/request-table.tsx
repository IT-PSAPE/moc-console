import { Badge } from "@/components/display/badge";
import { DataTable } from "@/components/display/data-table";
import { Drawer } from "@/components/overlays/drawer";
import { RequestDrawer } from "./request-drawer";
import { CircleAlert, Tag } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import type { Request } from "@/types/requests";
import { statusColor, statusLabel, priorityColor, priorityLabel, categoryLabel, categoryColor } from "@/types/requests";
import { formatUtcIsoInBrowserTimeZone } from "@/utils/browser-date-time";

const empty = <span className="text-quaternary">—</span>;

const columns = [
    { key: "title", header: "Title" },
    {
        key: "status",
        header: "Status",
        render: (_: unknown, row: Request) => (
            <Badge label={statusLabel[row.status]} color={statusColor[row.status]} />
        ),
    },
    {
        key: "priority",
        header: "Priority",
        render: (_: unknown, row: Request) => (
            <Badge label={priorityLabel[row.priority]} icon={<CircleAlert />} color={priorityColor[row.priority]} />
        ),
    },
    {
        key: "type",
        header: "Type",
        render: (_: unknown, row: Request) => (
            <Badge label={categoryLabel[row.category]} icon={<Tag />} color={categoryColor[row.category]} />
        ),
    },
    {
        key: "requestedBy",
        header: "Requested By",
        render: (value: unknown) => (value as string) || empty,
    },
    {
        key: "dueDate",
        header: "Due Date",
        render: (value: unknown) => (value ? formatUtcIsoInBrowserTimeZone(value as string, { day: "2-digit", month: "2-digit", year: "numeric" }) : empty),
    },
    {
        key: "updatedAt",
        header: "Updated",
        render: (value: unknown) => (value ? formatUtcIsoInBrowserTimeZone(value as string, { day: "2-digit", month: "2-digit", year: "numeric" }) : empty),
    },
];

export function RequestTable({ requests }: { requests: Request[] }) {
    const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);

    const isDirtyRef = useRef(false);
    const requestCloseRef = useRef<(() => void) | null>(null);

    const visible = useMemo(() => requests.filter((r) => r.status !== "archived"), [requests]);

    const handleOpenChange = useCallback((open: boolean) => {
        if (!open && isDirtyRef.current) {
            requestCloseRef.current?.();
        } else if (!open) {
            setSelectedRequest(null);
        }
    }, []);

    const handleRequestClose = useCallback(() => {
        setSelectedRequest(null);
    }, []);

    return (
        <div className="p-4 pt-0 mx-auto w-full max-w-content">
            <DataTable
                data={visible}
                columns={columns}
                emptyMessage="No requests"
                onRowClick={(row) => setSelectedRequest(row)}
                className="rounded-lg border border-secondary overflow-hidden"
            />
            <Drawer.Root open={!!selectedRequest} onOpenChange={handleOpenChange}>
                {selectedRequest && (
                    <RequestDrawer
                        request={selectedRequest}
                        onRequestClose={handleRequestClose}
                        isDirtyRef={isDirtyRef}
                        requestCloseRef={requestCloseRef}
                    />
                )}
            </Drawer.Root>
        </div>
    );
}
