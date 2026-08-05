import { Drawer } from "@moc/ui/components/overlays/drawer";
import type { Request } from "@moc/types/requests";
import { RequestDrawer } from "./request-drawer";
import { useDrawerItem } from "@/hooks/use-drawer-item";
import { ResponsiveDrawerTrigger } from "@/features/responsive-drawer-trigger";
import { routes } from "@/screens/console-routes";
import { RequestItemContent } from "./request-item-content";

export function RequestItem({ request, onDrawerOpenChange }: { request: Request; onDrawerOpenChange?: (open: boolean) => void }) {
    const { open, isDirtyRef, requestCloseRef, handleOpenChange, handleClose } = useDrawerItem(onDrawerOpenChange);

    return (
        <Drawer open={open} onOpenChange={handleOpenChange}>
            <ResponsiveDrawerTrigger.Card mobileHref={`/${routes.requests}/${request.id}`}>
                <RequestItemContent request={request} />
            </ResponsiveDrawerTrigger.Card>
            <RequestDrawer
                request={request}
                onRequestClose={handleClose}
                isDirtyRef={isDirtyRef}
                requestCloseRef={requestCloseRef}
            />
        </Drawer>
    )
}
