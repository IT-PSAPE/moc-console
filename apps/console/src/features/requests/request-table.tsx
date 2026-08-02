import { Badge } from "@moc/ui/components/display/badge";
import { DataTable } from "@moc/ui/components/display/data-table";
import { Drawer } from "@moc/ui/components/overlays/drawer";
import { RequestDrawer } from "./request-drawer";
import { CircleAlert, Tag } from "lucide-react";
import { useMemo } from "react";
import type { Request } from "@moc/types/requests";
import { statusColor, statusLabel, priorityColor, priorityLabel, categoryLabel, categoryColor } from "@moc/types/requests";
import { formatUtcIsoInBrowserTimeZone } from "@moc/utils/browser-date-time";
import { useTableRowDrawer } from "@/hooks/use-drawer-item";

const empty = <span className="text-quaternary">—</span>;

const columns = [
    { key: "title", header: "Title", width: 260 },
    {
        key: "status",
        header: "Status",
        width: 130,
        render: (_: unknown, row: Request) => (
            <Badge label={statusLabel[row.status]} color={statusColor[row.status]} />
        ),
    },
    {
        key: "priority",
        header: "Priority",
        width: 130,
        render: (_: unknown, row: Request) => (
            <Badge label={priorityLabel[row.priority]} icon={<CircleAlert />} color={priorityColor[row.priority]} />
        ),
    },
    {
        key: "type",
        header: "Type",
        width: 180,
        render: (_: unknown, row: Request) => (
            <Badge label={categoryLabel[row.category]} icon={<Tag />} color={categoryColor[row.category]} />
        ),
    },
    {
        key: "requestedBy",
        header: "Requested By",
        width: 160,
        render: (value: unknown) => (value as string) || empty,
    },
    {
        key: "dueDate",
        header: "Due Date",
        width: 160,
        render: (value: unknown) => (value ? formatUtcIsoInBrowserTimeZone(value as string, { day: "2-digit", month: "2-digit", year: "numeric" }) : empty),
    },
    {
        key: "updatedAt",
        header: "Updated",
        width: 160,
        render: (value: unknown) => (value ? formatUtcIsoInBrowserTimeZone(value as string, { day: "2-digit", month: "2-digit", year: "numeric" }) : empty),
    },
];

export function RequestTableView({ requests }: { requests: Request[] }) {
    const { selected, setSelected, isDirtyRef, requestCloseRef, handleOpenChange, handleClose } =
        useTableRowDrawer<Request>();

    const visible = useMemo(() => requests.filter((r) => r.status !== "archived"), [requests]);

    return (
        <div>
            <DataTable
                data={visible}
                columns={columns}
                minWidth={1180}
                emptyMessage="No requests"
                onRowClick={(row) => setSelected(row)}
            />
            <Drawer open={!!selected} onOpenChange={handleOpenChange}>
                {selected && (
                    <RequestDrawer
                        request={selected}
                        onRequestClose={handleClose}
                        isDirtyRef={isDirtyRef}
                        requestCloseRef={requestCloseRef}
                    />
                )}
            </Drawer>
        </div>
    );
}
