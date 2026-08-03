import { Calendar, type CalendarEvent } from "@moc/ui/components/display/calendar"
import { Drawer } from "@moc/ui/components/overlays/drawer"
import type { Request } from "@moc/types/requests";
import { categoryColor } from "@moc/types/requests";
import { RequestDrawer } from "./request-drawer";
import { useMemo } from "react";
import { ResponsiveDrawerTrigger } from "@/features/responsive-drawer-trigger";
import { routes } from "@/screens/console-routes";

function toCalendarEvents(requests: Request[]): CalendarEvent<Request>[] {
    return requests
        .map((r) => ({
            id: r.id,
            date: new Date(r.dueDate),
            label: r.title,
            color: categoryColor[r.category],
            data: r,
        }));
}

export function RequestCalendarView({ requests }: { requests: Request[] }) {
    const events = useMemo(() => toCalendarEvents(requests), [requests]);

    function renderRequest(event: CalendarEvent<Request>) {
        const request = event.data;
        if (!request) return null;

        return (
            <Drawer key={request.id}>
                <ResponsiveDrawerTrigger mobileHref={`/${routes.requests}/${request.id}`} className="w-full rounded text-left">
                    <Calendar.Event color={event.color}>{event.label}</Calendar.Event>
                </ResponsiveDrawerTrigger>
                <RequestDrawer request={request} />
            </Drawer>
        );
    }

    return (
        <div>
            <Calendar events={events} renderEvent={renderRequest} />
        </div>
    )
}
