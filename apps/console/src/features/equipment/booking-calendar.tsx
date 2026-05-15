import { Calendar, type CalendarEvent } from "@moc/ui/components/display/calendar";
import { Drawer } from "@moc/ui/components/overlays/drawer";
import { Badge } from "@moc/ui/components/display/badge";
import { Label, Paragraph } from "@moc/ui/components/display/text";
import { cn } from "@moc/utils/cn";
import type { Booking } from "@moc/types/equipment";
import type { Equipment } from "@moc/types/equipment";
import { bookingStatusLabel, bookingStatusColor } from "@moc/types/equipment";
import { BookingDrawer } from "./booking-drawer";
import { useEquipment } from "./equipment-provider";
import { useMemo } from "react";
import { Circle } from "lucide-react";
import { formatUtcIsoInBrowserTimeZone } from "@moc/utils/browser-date-time";

type BookingEventData = {
  booking: Booking;
  equipment: Equipment | undefined;
};

function toCalendarEvents(
  bookings: Booking[],
  equipmentMap: Map<string, Equipment>,
): CalendarEvent<BookingEventData>[] {
  return bookings
    .filter((b) => b.status !== "returned")
    .map((b) => ({
      id: b.equipmentId,
      date: new Date(b.checkedOutDate),
      label: b.equipmentName,
      color: (b.status === "booked" ? "blue" : "yellow") as "blue" | "yellow",
      data: {
        booking: b,
        equipment: equipmentMap.get(b.equipmentId),
      },
    }));
}

function formatDate(dateStr: string) {
  return formatUtcIsoInBrowserTimeZone(dateStr);
}

export function BookingCalendarView({ bookings }: { bookings: Booking[] }) {
  const { state: { equipment } } = useEquipment();
  const equipmentMap = useMemo(() => {
    const map = new Map<string, Equipment>();
    for (const item of equipment) map.set(item.id, item);
    return map;
  }, [equipment]);
  const events = useMemo(() => toCalendarEvents(bookings, equipmentMap), [bookings, equipmentMap]);

  return (
    <div className="p-4 pt-0 mx-auto w-full max-w-content">
      <Calendar
        events={events}
        cellDrawer={{
          renderItem: (event, index) => {
            const data = event.data;
            if (!data) return null;

            const { booking } = data;

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
                      <Label.sm className="truncate">{booking.equipmentName}</Label.sm>
                      <Paragraph.xs className="text-tertiary">
                        Due {formatDate(booking.expectedReturnAt)} &middot; {booking.bookedBy}
                      </Paragraph.xs>
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
