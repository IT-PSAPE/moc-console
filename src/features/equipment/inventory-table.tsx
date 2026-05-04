import { Badge } from "@/components/display/badge";
import { DataTable } from "@/components/display/data-table";
import { Drawer } from "@/components/overlays/drawer";
import { useCallback, useMemo, useRef, useState } from "react";
import { equipmentStatusColor, equipmentStatusLabel, equipmentCategoryLabel, equipmentCategoryColor } from "@/types/equipment/constants";
import type { Equipment } from "@/types/equipment";
import { EquipmentThumbnail } from "./equipment-thumbnail";
import { EquipmentDrawer } from "./equipment-drawer";
import { formatUtcIsoInBrowserTimeZone } from "@/utils/browser-date-time";

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

export function InventoryTable({ equipment }: { equipment: Equipment[] }) {
    const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);

    const isDirtyRef = useRef(false);
    const requestCloseRef = useRef<(() => void) | null>(null);

    const visible = useMemo(() => equipment.filter((e) => e.status !== "maintenance"), [equipment]);

    const handleOpenChange = useCallback((open: boolean) => {
        if (!open && isDirtyRef.current) {
            requestCloseRef.current?.();
        } else if (!open) {
            setSelectedEquipment(null);
        }
    }, []);

    const handleEquipmentClose = useCallback(() => {
        setSelectedEquipment(null);
    }, []);

    return (
        <div className="p-4 pt-0 mx-auto w-full max-w-content">
            <DataTable
                data={visible}
                columns={columns}
                emptyMessage="No equipment found"
                onRowClick={(row) => setSelectedEquipment(row)}
                className="rounded-lg border border-secondary overflow-hidden"
            />
            <Drawer.Root open={!!selectedEquipment} onOpenChange={handleOpenChange}>
                {selectedEquipment && (
                    <EquipmentDrawer
                        equipment={selectedEquipment}
                        onEquipmentClose={handleEquipmentClose}
                        isDirtyRef={isDirtyRef}
                        requestCloseRef={requestCloseRef}
                    />
                )}
            </Drawer.Root>
        </div>
    );
}
