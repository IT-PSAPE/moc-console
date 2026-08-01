import { Label, Paragraph } from "@moc/ui/components/display/text";
import { Drawer } from "@moc/ui/components/overlays/drawer";
import type { Equipment } from "@moc/types/equipment";
import { EquipmentDrawer } from "./equipment-drawer";
import { EquipmentThumbnail } from "./equipment-thumbnail";
import { useDrawerItem } from "@/hooks/use-drawer-item";
import { ResponsiveDrawerTrigger } from "@/features/responsive-drawer-trigger";
import { routes } from "@/screens/console-routes";

export function EquipmentItem({ equipment, onDrawerOpenChange }: { equipment: Equipment; onDrawerOpenChange?: (open: boolean) => void }) {
    const { open, isDirtyRef, requestCloseRef, handleOpenChange, handleClose } = useDrawerItem(onDrawerOpenChange);

    return (
        <Drawer open={open} onOpenChange={handleOpenChange}>
            <ResponsiveDrawerTrigger.Card mobileHref={`/${routes.equipment}/${equipment.id}`} className="flex items-start gap-3 p-3">
                    <EquipmentThumbnail equipment={equipment} size="lg" />
                    <div className="flex-1">
                        <Label.sm className="block truncate">{equipment.name}</Label.sm>
                        <Paragraph.xs className="block text-quaternary font-mono truncate">{equipment.serialNumber}</Paragraph.xs>
                        <Paragraph.xs className="block text-quaternary mt-0.5">{equipment.category} • {equipment.location}</Paragraph.xs>
                    </div>
            </ResponsiveDrawerTrigger.Card>
            <EquipmentDrawer
                equipment={equipment}
                onEquipmentClose={handleClose}
                isDirtyRef={isDirtyRef}
                requestCloseRef={requestCloseRef}
            />
        </Drawer>
    );
}
