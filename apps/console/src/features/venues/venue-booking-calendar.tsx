import { useMemo } from "react";
import { Calendar, type CalendarEvent } from "@moc/ui/components/display/calendar"
import { Drawer } from "@moc/ui/components/overlays/drawer"
import type { VenueBooking } from "@moc/types/venues";
import { deriveVenueBookingPhase, venueBookingPhaseColor } from "@moc/types/venues";
import { VenueBookingDrawer } from "./venue-booking-drawer";
import { useVenueBookings } from "./venue-bookings-provider";
import { ResponsiveDrawerTrigger } from "@/features/responsive-drawer-trigger";
import { routes } from "@/screens/console-routes";

function toCalendarEvents(bookings: VenueBooking[], at: Date): CalendarEvent<VenueBooking>[] {
    return bookings.map((booking) => ({
        id: booking.id,
        date: new Date(booking.startsAt),
        label: booking.title,
        color: venueBookingPhaseColor[deriveVenueBookingPhase(booking.status, booking.startsAt, booking.endsAt, at)],
        data: booking,
    }));
}

export function VenueBookingCalendarView({ bookings }: { bookings: VenueBooking[] }) {
    const { state: { at } } = useVenueBookings();
    const events = useMemo(() => toCalendarEvents(bookings, at), [bookings, at]);

    function renderBooking(event: CalendarEvent<VenueBooking>) {
        const booking = event.data;
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
