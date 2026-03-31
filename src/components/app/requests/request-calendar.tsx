import { Calendar, type CalendarEvent } from "@/components/display/calendar"

const sampleEvents: CalendarEvent[] = [
    { date: new Date(2026, 2, 27), label: 'Revelation Class for Au...', color: 'orange' },
    { date: new Date(2026, 2, 28), label: 'Equipment for Class 2 w...', color: 'orange' },
    { date: new Date(2026, 2, 28), label: 'Mission Church Commu...', color: 'blue' },
    { date: new Date(2026, 2, 29), label: 'Projector', color: 'orange' },
    { date: new Date(2026, 2, 30), label: 'Projector, screen, HDMI...', color: 'orange' },
    { date: new Date(2026, 2, 31), label: 'Equipment: 2 wired mic...', color: 'orange' },
]

export function RequestCalendar() {
    return (
        <div className='p-4 pt-0 mx-auto w-full max-w-content'>
            <Calendar.Root events={sampleEvents} />
        </div>
    )
}