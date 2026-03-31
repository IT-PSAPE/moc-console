import { Calendar, type CalendarEvent } from "@/components/display/calendar"
import { Drawer } from "@/components/overlays/drawer"
import { cn } from "@/utils/cn"
import type { Request } from "@/types/requests";
import { categoryColor, eventColorMap } from "@/types/requests";
import { RequestDrawer } from "./request-drawer";
import { useMemo } from "react";

function toCalendarEvents(requests: Request[]): CalendarEvent[] {
    return requests
        .filter((r) => r.dueDate !== null)
        .map((r) => ({
            id: r.id,
            date: new Date(r.dueDate!),
            label: r.title,
            color: categoryColor[r.category],
        }));
}

export function RequestCalendar({ requests }: { requests: Request[] }) {
    const events = toCalendarEvents(requests);
    const requestMap = useMemo(() => {
        const map = new Map<string, Request>();
        for (const r of requests) map.set(r.id, r);
        return map;
    }, [requests]);

    return (
        <div className='p-4 pt-0 mx-auto w-full max-w-content'>
            <Calendar.Root
                events={events}
                renderDay={({ date, isCurrentMonth, isToday, events: dayEvents }) => (
                    <div className={cn(
                        'flex min-h-24 flex-col p-1.5',
                        !isCurrentMonth && 'bg-secondary',
                    )}>
                        <span className={cn(
                            'mb-1 inline-flex size-6 items-center justify-center self-start rounded-full text-paragraph-xs',
                            isToday && 'bg-brand_solid text-primary_on-brand',
                            !isToday && isCurrentMonth && 'text-primary',
                            !isToday && !isCurrentMonth && 'text-quaternary',
                        )}>
                            {date.getDate()}
                        </span>
                        <div className="flex flex-col gap-0.5 overflow-hidden">
                            {dayEvents.slice(0, 2).map((event) => {
                                const request = event.id ? requestMap.get(event.id) : undefined;
                                const pill = (
                                    <div
                                        className={cn(
                                            'truncate rounded px-1.5 py-0.5 text-paragraph-xs cursor-pointer hover:opacity-80 transition-opacity',
                                            eventColorMap[event.color ?? 'gray'],
                                        )}
                                        title={event.label}
                                    >
                                        {event.label}
                                    </div>
                                );

                                if (!request) return <div key={event.id ?? event.label}>{pill}</div>;

                                return (
                                    <Drawer.Root key={request.id}>
                                        <Drawer.Trigger>{pill}</Drawer.Trigger>
                                        <RequestDrawer request={request} />
                                    </Drawer.Root>
                                );
                            })}
                            {dayEvents.length > 2 && (
                                <span className="px-1.5 text-paragraph-xs text-quaternary">+{dayEvents.length - 2} more</span>
                            )}
                        </div>
                    </div>
                )}
            />
        </div>
    )
}
