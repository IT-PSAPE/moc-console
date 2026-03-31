import { Calendar, type CalendarEvent } from "@/components/display/calendar"
import type { Request } from "@/types/requests";

const categoryColor = {
    video_production: "orange",
    video_shooting: "orange",
    graphic_design: "purple",
    event: "blue",
    education: "green",
} as const;

function toCalendarEvents(requests: Request[]): CalendarEvent[] {
    return requests
        .filter((r) => r.dueDate !== null)
        .map((r) => ({
            date: new Date(r.dueDate!),
            label: r.title,
            color: categoryColor[r.category],
        }));
}

export function RequestCalendar({ requests }: { requests: Request[] }) {
    const events = toCalendarEvents(requests);

    return (
        <div className='p-4 pt-0 mx-auto w-full max-w-content'>
            <Calendar.Root events={events} />
        </div>
    )
}
