import { CalendarFold, CircleAlert, Tag } from "lucide-react";
import { Label, Paragraph } from "@moc/ui/components/display/text";
import { Badge } from "@moc/ui/components/display/badge";
import { Drawer } from "@moc/ui/components/overlays/drawer";
import { cv } from "@moc/utils/cv";
import type { Request } from "@moc/types/requests";
import { priorityColor, categoryLabel } from "@moc/types/requests";
import { RequestDrawer } from "./request-drawer";
import { formatUtcIsoInBrowserTimeZone } from "@moc/utils/browser-date-time";
import { useDrawerItem } from "@/hooks/use-drawer-item";
import { ResponsiveDrawerTrigger } from "@/features/responsive-drawer-trigger";
import { routes } from "@/screens/console-routes";

const itemVariants = cv({
    base: [
        'flex w-full justify-between gap-4 px-4 py-3 *:flex-1',
    ],
    variants: {
        vertical: {
            true: ['flex-col'],
            false: ['items-center *:odd:flex-1 *:odd:max-w-xl *:even:justify-end max-mobile:flex-col *:max-mobile:odd:max-none *:max-mobile:even:justify-start *:max-mobile:w-full'],
        },
    },
    defaultVariants: {
        vertical: 'false',
    },
})

export function RequestItem({ request, vertical, onDrawerOpenChange }: { request: Request; vertical?: boolean; onDrawerOpenChange?: (open: boolean) => void }) {
    const { open, isDirtyRef, requestCloseRef, handleOpenChange, handleClose } = useDrawerItem(onDrawerOpenChange);

    return (
        <Drawer open={open} onOpenChange={handleOpenChange}>
            <ResponsiveDrawerTrigger.Card mobileHref={`/${routes.requests}/${request.id}`} className={itemVariants({ vertical: vertical ? 'true' : 'false' })}>
                    <div>
                        <Label.sm>{request.title}</Label.sm>
                        <Paragraph.sm className="text-tertiary line-clamp-2
                        ">{request.what}</Paragraph.sm>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                            label={request.priority.charAt(0).toUpperCase() + request.priority.slice(1)}
                            icon={<CircleAlert />}
                            color={priorityColor[request.priority]}
                        />
                        <Badge label={categoryLabel[request.category]} icon={<Tag />} />
                        {request.dueDate && (
                            <Badge
                                icon={<CalendarFold />}
                                label={formatUtcIsoInBrowserTimeZone(request.dueDate, { day: "2-digit", month: "2-digit", year: "numeric" })}
                                variant="outline"
                            />
                        )}
                    </div>
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
