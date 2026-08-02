import { ListItemCard } from "@moc/ui/components/display/list-item-card";
import { Drawer } from "@moc/ui/components/overlays/drawer";
import type { Equipment } from "@moc/types/equipment";
import { EquipmentDrawer } from "./equipment-drawer";
import { useDrawerItem } from "@/hooks/use-drawer-item";
import { ResponsiveDrawerTrigger } from "@/features/responsive-drawer-trigger";
import { routes } from "@/screens/console-routes";
import { MapPin, Tag } from "lucide-react";

export function EquipmentItem({ equipment, onDrawerOpenChange }: { equipment: Equipment; onDrawerOpenChange?: (open: boolean) => void }) {
    const { open, isDirtyRef, requestCloseRef, handleOpenChange, handleClose } = useDrawerItem(onDrawerOpenChange);

    return (
        <Drawer open={open} onOpenChange={handleOpenChange}>
            <ResponsiveDrawerTrigger.Card mobileHref={`/${routes.equipment}/${equipment.id}`}>
                <ListItemCard.Root>
                    <ListItemCard.Content>
                        <ListItemCard.Title>{equipment.name}</ListItemCard.Title>
                        {equipment.serialNumber && <ListItemCard.Subtitle className="font-mono">{equipment.serialNumber}</ListItemCard.Subtitle>}
                        <ListItemCard.Meta>
                            <ListItemCard.MetaItem icon={<Tag />}>{equipment.category}</ListItemCard.MetaItem>
                            <ListItemCard.MetaItem icon={<MapPin />}>{equipment.location}</ListItemCard.MetaItem>
                        </ListItemCard.Meta>
                    </ListItemCard.Content>
                </ListItemCard.Root>
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
