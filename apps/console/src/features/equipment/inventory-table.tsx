import { Badge } from "@/components/display/badge";
import { DataTable } from "@/components/display/data-table";
import { Drawer } from "@/components/overlays/drawer";
import { useMemo } from "react";
import { equipmentStatusColor, equipmentStatusLabel, equipmentCategoryLabel, equipmentCategoryColor } from "@/types/equipment/constants";
import type { Equipment } from "@/types/equipment";
import { EquipmentThumbnail } from "./equipment-thumbnail";
import { EquipmentDrawer } from "./equipment-drawer";
import { formatUtcIsoInBrowserTimeZone } from "@/utils/browser-date-time";
import { useTableRowDrawer } from "@/hooks/use-drawer-item";

const empty = <span className="text-quaternary">—</span>;

const columns = [
    {
        key: "thumbnail",
        header: "",
        width: 48,
        render: (_: unknown, row: Equipment) => <EquipmentThumbnail equipment={row} />,
    },
    { key: "name", header: "Equipment" },
    {
        key: "serialNumber",
        header: "Serial Number",
        render: (value: unknown) => <span className="font-mono text-tertiary">{(value as string) || ""}</span>,
    },
    {
        key: "category",
        header: "Category",
        render: (_: unknown, row: Equipment) => (
            <Badge label={equipmentCategoryLabel[row.category]} color={equipmentCategoryColor[row.category]} />
        ),
    },
    {
        key: "status",
        header: "Status",
        render: (_: unknown, row: Equipment) => (
            <Badge label={equipmentStatusLabel[row.status]} color={equipmentStatusColor[row.status]} />
        ),
    },
    { key: "location", header: "Location", render: (value: unknown) => (value as string) || empty },
    {
        key: "lastActiveDate",
        header: "Last Active",
        render: (value: unknown) =>
            value
                ? formatUtcIsoInBrowserTimeZone(value as string, { day: "2-digit", month: "2-digit", year: "numeric" })
                : empty,
    },
];

export function InventoryTableView({ equipment }: { equipment: Equipment[] }) {
    const { selected, setSelected, isDirtyRef, requestCloseRef, handleOpenChange, handleClose } =
        useTableRowDrawer<Equipment>();

    const visible = useMemo(() => equipment.filter((e) => e.status !== "maintenance"), [equipment]);

    return (
        <div className="p-4 pt-0 mx-auto w-full max-w-content">
            <DataTable
                data={visible}
                columns={columns}
                emptyMessage="No equipment found"
                onRowClick={(row) => setSelected(row)}
                className="rounded-lg border border-secondary overflow-hidden"
            />
            <Drawer open={!!selected} onOpenChange={handleOpenChange}>
                {selected && (
                    <EquipmentDrawer
                        equipment={selected}
                        onEquipmentClose={handleClose}
                        isDirtyRef={isDirtyRef}
                        requestCloseRef={requestCloseRef}
                    />
                )}
            </Drawer>
        </div>
    );
}
