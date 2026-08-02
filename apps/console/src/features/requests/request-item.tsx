import { CalendarFold, CircleAlert, Tag } from "lucide-react";
import { ListItemCard } from "@moc/ui/components/display/list-item-card";
import { Drawer } from "@moc/ui/components/overlays/drawer";
import type { Request } from "@moc/types/requests";
import { priorityLabel, categoryLabel } from "@moc/types/requests";
import { RequestDrawer } from "./request-drawer";
import { formatUtcIsoInBrowserTimeZone } from "@moc/utils/browser-date-time";
import { useDrawerItem } from "@/hooks/use-drawer-item";
import { ResponsiveDrawerTrigger } from "@/features/responsive-drawer-trigger";
import { routes } from "@/screens/console-routes";

export function RequestItem({ request, onDrawerOpenChange }: { request: Request; onDrawerOpenChange?: (open: boolean) => void }) {
    const { open, isDirtyRef, requestCloseRef, handleOpenChange, handleClose } = useDrawerItem(onDrawerOpenChange);

    return (
        <Drawer open={open} onOpenChange={handleOpenChange}>
            <ResponsiveDrawerTrigger.Card mobileHref={`/${routes.requests}/${request.id}`}>
                <ListItemCard.Root>
                    <ListItemCard.Content>
                        <ListItemCard.Title>{request.title}</ListItemCard.Title>
                        <ListItemCard.Subtitle>{request.what}</ListItemCard.Subtitle>
                        <ListItemCard.Meta>
                            <ListItemCard.MetaItem className={request.priority === "urgent" ? "text-error" : undefined} icon={<CircleAlert />}>{priorityLabel[request.priority]}</ListItemCard.MetaItem>
                            <ListItemCard.MetaItem icon={<Tag />}>{categoryLabel[request.category]}</ListItemCard.MetaItem>
                            {request.dueDate && (
                                <ListItemCard.MetaItem icon={<CalendarFold />}>
                                    {formatUtcIsoInBrowserTimeZone(request.dueDate, { day: "2-digit", month: "2-digit", year: "numeric" })}
                                </ListItemCard.MetaItem>
                            )}
                        </ListItemCard.Meta>
                    </ListItemCard.Content>
                </ListItemCard.Root>
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
