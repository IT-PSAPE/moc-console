import { Calendar, type CalendarEvent } from "@moc/ui/components/display/calendar";
import { Drawer } from "@moc/ui/components/overlays/drawer";
import type { Booking } from "@moc/types/equipment";
import { bookingStatusColor } from "@moc/types/equipment";
import { BookingDrawer } from "./booking-drawer";
import { useMemo } from "react";
import { ResponsiveDrawerTrigger } from "@/features/responsive-drawer-trigger";
import { routes } from "@/screens/console-routes";

type BookingEventData = {
  booking: Booking;
};

function toCalendarEvents(bookings: Booking[]): CalendarEvent<BookingEventData>[] {
  return bookings
    .map((b) => ({
      id: b.id,
      date: new Date(b.checkedOutDate),
      label: b.title,
      color: bookingStatusColor[b.status],
      data: { booking: b },
    }));
}

export function BookingCalendarView({ bookings }: { bookings: Booking[] }) {
  const events = useMemo(() => toCalendarEvents(bookings), [bookings]);

  function renderBooking(event: CalendarEvent<BookingEventData>) {
    const booking = event.data?.booking;
    if (!booking) return null;

    return (
      <Drawer key={booking.id}>
        <ResponsiveDrawerTrigger mobileHref={`/${routes.bookings}/${booking.id}`} className="w-full rounded text-left">
          <Calendar.Event color={event.color}>{event.label}</Calendar.Event>
        </ResponsiveDrawerTrigger>
        <BookingDrawer booking={booking} />
      </Drawer>
    );
  }

  return (
    <div>
      <Calendar events={events} renderEvent={renderBooking} />
    </div>
  );
}
