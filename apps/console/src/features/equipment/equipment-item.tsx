import { Drawer } from "@moc/ui/components/overlays/drawer";
import type { Equipment } from "@moc/types/equipment";
import { EquipmentDrawer } from "./equipment-drawer";
import { useDrawerItem } from "@/hooks/use-drawer-item";
import { ResponsiveDrawerTrigger } from "@/features/responsive-drawer-trigger";
import { routes } from "@/screens/console-routes";
import { EquipmentItemContent } from "./equipment-item-content";

export function EquipmentItem({ equipment, onDrawerOpenChange }: { equipment: Equipment; onDrawerOpenChange?: (open: boolean) => void }) {
    const { open, isDirtyRef, requestCloseRef, handleOpenChange, handleClose } = useDrawerItem(onDrawerOpenChange);

    return (
        <Drawer open={open} onOpenChange={handleOpenChange}>
            <ResponsiveDrawerTrigger.Card mobileHref={`/${routes.equipment}/${equipment.id}`}>
                <EquipmentItemContent equipment={equipment} />
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
