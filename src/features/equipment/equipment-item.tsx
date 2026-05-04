import { Label, Paragraph } from "@/components/display/text";
import { Drawer } from "@/components/overlays/drawer";
import { cn } from "@/utils/cn";
import type { Equipment } from "@/types/equipment";
import { EquipmentDrawer } from "./equipment-drawer";
import { EquipmentThumbnail } from "./equipment-thumbnail";
import { useCallback, useRef, useState } from "react";

const baseCard = "w-full bg-background-primary rounded-lg shadow-[0px_1px_2px_0px_rgba(10,13,18,0.05)] outline outline-1 outline-offset-[-1px] outline-border-secondary cursor-pointer hover:bg-background-primary-hover active:bg-background-primary-hover transition-colors";

export function EquipmentItem({ equipment, onDrawerOpenChange }: { equipment: Equipment; onDrawerOpenChange?: (open: boolean) => void }) {
    const [open, setOpen] = useState(false);
    const isDirtyRef = useRef(false);
    const requestCloseRef = useRef<(() => void) | null>(null);

    const handleOpenChange = useCallback((nextOpen: boolean) => {
        if (nextOpen) {
            setOpen(true);
            onDrawerOpenChange?.(true);
        } else if (isDirtyRef.current) {
            requestCloseRef.current?.();
        } else {
            setOpen(false);
            onDrawerOpenChange?.(false);
        }
    }, [onDrawerOpenChange]);

    const handleEquipmentClose = useCallback(() => {
        setOpen(false);
        onDrawerOpenChange?.(false);
    }, [onDrawerOpenChange]);

    return (
        <Drawer.Root open={open} onOpenChange={handleOpenChange}>
            <Drawer.Trigger>
                <div className={cn(baseCard, "flex items-start gap-3 p-3")}>
                    <EquipmentThumbnail equipment={equipment} size="lg" />
                    <div className="flex-1">
                        <Label.sm className="block truncate">{equipment.name}</Label.sm>
                        <Paragraph.xs className="block text-quaternary font-mono truncate">{equipment.serialNumber}</Paragraph.xs>
                        <Paragraph.xs className="block text-quaternary mt-0.5">{equipment.category} • {equipment.location}</Paragraph.xs>
                    </div>
                </div>
            </Drawer.Trigger>
            <EquipmentDrawer
                equipment={equipment}
                onEquipmentClose={handleEquipmentClose}
                isDirtyRef={isDirtyRef}
                requestCloseRef={requestCloseRef}
            />
        </Drawer.Root>
    );
}
