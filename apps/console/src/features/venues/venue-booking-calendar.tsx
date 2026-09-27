import { useMemo } from "react";
import { Calendar, type CalendarEvent } from "@moc/ui/components/display/calendar"
import { Drawer } from "@moc/ui/components/overlays/drawer"
import type { VenueBooking, VenueBookingOccurrence } from "@moc/types/venues";
import { deriveVenueBookingPhase, venueBookingPhaseColor } from "@moc/types/venues";
import { VenueBookingDrawer } from "./venue-booking-drawer";
import { useVenueBookings } from "./venue-bookings-provider";
import { ResponsiveDrawerTrigger } from "@/features/responsive-drawer-trigger";
import { routes } from "@/screens/console-routes";

type VenueOccurrenceEvent = { booking: VenueBooking; occurrence: VenueBookingOccurrence };

function toCalendarEvents(bookings: VenueBooking[], at: Date): CalendarEvent<VenueOccurrenceEvent>[] {
    return bookings.flatMap((booking) => booking.occurrences.map((occurrence) => ({
        id: `${booking.id}:${occurrence.index}`,
        date: new Date(occurrence.startsAt),
        label: booking.title,
        color: venueBookingPhaseColor[deriveVenueBookingPhase(booking.status, occurrence.startsAt, occurrence.endsAt, at)],
        data: { booking, occurrence },
    })));
}

export function VenueBookingCalendarView({ bookings }: { bookings: VenueBooking[] }) {
    const { state: { at } } = useVenueBookings();
    const events = useMemo(() => toCalendarEvents(bookings, at), [bookings, at]);

    function renderBooking(event: CalendarEvent<VenueOccurrenceEvent>) {
        const booking = event.data?.booking;
        if (!booking) return null;

        return (
            <Drawer key={booking.id}>
                <ResponsiveDrawerTrigger mobileHref={`/${routes.venues}/${booking.id}`} className="w-full rounded text-left">
                    <Calendar.Event color={event.color}>{event.label}</Calendar.Event>
                </ResponsiveDrawerTrigger>
                <VenueBookingDrawer booking={booking} />
            </Drawer>
        );
    }

    return (
        <div>
            <Calendar events={events} renderEvent={renderBooking} />
        </div>
    )
}
