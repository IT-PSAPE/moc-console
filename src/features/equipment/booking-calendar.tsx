import { Calendar, type CalendarEvent } from "@/components/display/calendar";
import { Drawer } from "@/components/overlays/drawer";
import { Badge } from "@/components/display/badge";
import { Label, Paragraph } from "@/components/display/text";
import { cn } from "@/utils/cn";
import type { Booking } from "@/types/equipment";
import type { Equipment } from "@/types/equipment";
import { bookingStatusLabel, bookingStatusColor } from "@/types/equipment";
import { EquipmentDrawer } from "./equipment-drawer";
import { useMemo } from "react";
import { Circle } from "lucide-react";

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
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type BookingCalendarProps = {
  bookings: Booking[];
  equipmentMap: Map<string, Equipment>;
};

export function BookingCalendar({ bookings, equipmentMap }: BookingCalendarProps) {
  const events = useMemo(() => toCalendarEvents(bookings, equipmentMap), [bookings, equipmentMap]);

  return (
    <div className="p-4 pt-0 mx-auto w-full max-w-content">
      <Calendar.Root
        events={events}
        cellDrawer={{
          renderItem: (event, index) => {
            const data = event.data;
            if (!data) return null;

            const { booking, equipment } = data;

            const item = (
              <div
                key={booking.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3",
                  index > 0 && "border-t border-secondary",
                  equipment && "cursor-pointer hover:bg-secondary/50 transition-colors",
                )}
              >
                <Circle className={cn("size-2 shrink-0", booking.status === "booked" ? "fill-info text-info" : "fill-warning text-warning")} />
                <div className="flex-1 min-w-0">
                  <Label.sm className="truncate">{booking.equipmentName}</Label.sm>
                  <Paragraph.xs className="text-tertiary">
                    Booked by {booking.bookedBy} &middot; {formatDate(booking.checkedOutDate)}
                  </Paragraph.xs>
                </div>
                <Badge
                  label={bookingStatusLabel[booking.status]}
                  color={bookingStatusColor[booking.status]}
                  variant="filled"
                />
              </div>
            );

            if (!equipment) return item;

            return (
              <Drawer.Root key={booking.id}>
                <Drawer.Trigger>{item}</Drawer.Trigger>
                <EquipmentDrawer equipment={equipment} />
              </Drawer.Root>
            );
          },
        }}
      />
    </div>
  );
}
