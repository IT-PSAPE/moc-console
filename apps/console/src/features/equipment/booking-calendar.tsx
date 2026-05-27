import { Calendar, type CalendarEvent } from "@moc/ui/components/display/calendar";
import { Drawer } from "@moc/ui/components/overlays/drawer";
import { Badge } from "@moc/ui/components/display/badge";
import { Label, Paragraph } from "@moc/ui/components/display/text";
import { cn } from "@moc/utils/cn";
import type { Booking } from "@moc/types/equipment";
import { bookingStatusLabel, bookingStatusColor } from "@moc/types/equipment";
import { BookingDrawer } from "./booking-drawer";
import { useMemo } from "react";
import { Circle } from "lucide-react";
import { formatUtcIsoInBrowserTimeZone } from "@moc/utils/browser-date-time";

type BookingEventData = {
  booking: Booking;
};

function toCalendarEvents(bookings: Booking[]): CalendarEvent<BookingEventData>[] {
  return bookings
    .filter((b) => b.status !== "returned")
    .map((b) => ({
      id: b.id,
      date: new Date(b.checkedOutDate),
      label: b.title,
      color: (b.status === "booked" ? "blue" : "yellow") as "blue" | "yellow",
      data: { booking: b },
    }));
}

function formatDate(dateStr: string) {
  return formatUtcIsoInBrowserTimeZone(dateStr);
}

export function BookingCalendarView({ bookings }: { bookings: Booking[] }) {
  const events = useMemo(() => toCalendarEvents(bookings), [bookings]);

  return (
    <div className="p-4 pt-0 mx-auto w-full max-w-content">
      <Calendar
        events={events}
        cellDrawer={{
          renderItem: (event, index) => {
            const data = event.data;
            if (!data) return null;

            const { booking } = data;
            const itemCount = booking.items.length;
            const itemSummary = booking.items.map((i) => i.equipmentName).join(", ");

            return (
              <Drawer key={booking.id}>
                <Drawer.Trigger>
                  <div
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/50 transition-colors",
                      index > 0 && "border-t border-secondary",
                    )}
                  >
                    <Circle className={cn("size-2 shrink-0", booking.status === "booked" ? "fill-info text-info" : "fill-warning text-warning")} />
                    <div className="flex-1 min-w-0">
                      <Label.sm className="truncate">{booking.title}</Label.sm>
                      <Paragraph.xs className="text-tertiary truncate">
                        Due {formatDate(booking.expectedReturnAt)} &middot; {booking.bookedBy} &middot; {itemCount} item{itemCount === 1 ? "" : "s"}
                      </Paragraph.xs>
                      {itemSummary && (
                        <Paragraph.xs className="text-quaternary truncate">{itemSummary}</Paragraph.xs>
                      )}
                    </div>
                    <Badge
                      label={bookingStatusLabel[booking.status]}
                      color={bookingStatusColor[booking.status]}
                      variant="filled"
                    />
                  </div>
                </Drawer.Trigger>
                <BookingDrawer booking={booking} />
              </Drawer>
            );
          },
        }}
      />
    </div>
  );
}
