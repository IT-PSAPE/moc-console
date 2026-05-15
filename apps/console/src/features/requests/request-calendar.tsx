import { Calendar, type CalendarEvent } from "@moc/ui/components/display/calendar"
import { Drawer } from "@moc/ui/components/overlays/drawer"
import { Badge } from "@moc/ui/components/display/badge"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import { cn } from "@moc/utils/cn"
import type { Request } from "@moc/types/requests";
import { categoryColor, categoryLabel, statusColor, statusLabel } from "@moc/types/requests";
import { RequestDrawer } from "./request-drawer";
import { useMemo } from "react";
import { Circle } from "lucide-react";

const circleColorMap: Record<string, string> = {
    red: "fill-error text-error",
    orange: "fill-warning text-warning",
    yellow: "fill-warning text-warning",
    green: "fill-success text-success",
    blue: "fill-[var(--color-utility-blue-700)] text-[var(--color-utility-blue-700)]",
    purple: "fill-brand_secondary text-brand_secondary",
    gray: "fill-tertiary text-tertiary",
}

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

    return (
        <div className='p-4 pt-0 mx-auto w-full max-w-content'>
            <Calendar
                events={events}
                cellDrawer={{
                    renderItem: (event, index) => {
                        const request = event.data;
                        if (!request) return null;

                        const item = (
                            <div
                                key={request.id}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/50 transition-colors",
                                    index > 0 && "border-t border-secondary",
                                )}
                            >
                                <Circle className={cn("size-2 shrink-0", circleColorMap[categoryColor[request.category]])} />
                                <div className="flex-1 min-w-0">
                                    <Label.sm className="truncate">{request.title}</Label.sm>
                                    <Paragraph.xs className="text-tertiary">
                                        {categoryLabel[request.category]}
                                    </Paragraph.xs>
                                </div>
                                <Badge
                                    label={statusLabel[request.status]}
                                    color={statusColor[request.status]}
                                    variant="filled"
                                />
                            </div>
                        );

                        return (
                            <Drawer key={request.id}>
                                <Drawer.Trigger>{item}</Drawer.Trigger>
                                <RequestDrawer request={request} />
                            </Drawer>
                        );
                    },
                }}
            />
        </div>
    )
}
