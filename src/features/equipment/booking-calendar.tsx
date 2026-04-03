import { Calendar, type CalendarEvent } from "@/components/display/calendar";
import { Drawer } from "@/components/overlays/drawer";
import { cn } from "@/utils/cn";
import type { Booking } from "@/types/equipment";
import type { Equipment } from "@/types/equipment";
import { EquipmentDrawer } from "./equipment-drawer";
import { useMemo } from "react";

function toCalendarEvents(bookings: Booking[]): CalendarEvent[] {
  return bookings
    .filter((b) => b.status === "checked_out")
    .map((b) => ({
      id: b.equipmentId,
      date: new Date(b.checkedOutDate),
      label: b.equipmentName,
      color: "yellow" as const,
    }));
}

type BookingCalendarProps = {
  bookings: Booking[];
  equipmentMap: Map<string, Equipment>;
};

export function BookingCalendar({ bookings, equipmentMap }: BookingCalendarProps) {
  const events = useMemo(() => toCalendarEvents(bookings), [bookings]);

  return (
    <div className="p-4 pt-0 mx-auto w-full max-w-content">
      <Calendar.Root
        events={events}
        renderDay={({ date, isCurrentMonth, isToday, events: dayEvents }) => (
          <div
            className={cn(
              "flex min-h-24 flex-col p-1.5",
              !isCurrentMonth && "bg-secondary",
            )}
          >
            <span
              className={cn(
                "mb-1 inline-flex size-6 items-center justify-center self-start rounded-full text-paragraph-xs",
                isToday && "bg-brand_solid text-primary_on-brand",
                !isToday && isCurrentMonth && "text-primary",
                !isToday && !isCurrentMonth && "text-quaternary",
              )}
            >
              {date.getDate()}
            </span>
            <div className="flex flex-col gap-0.5 overflow-hidden">
              {dayEvents.slice(0, 2).map((event) => {
                const equipment = event.id ? equipmentMap.get(event.id) : undefined;
                const pill = (
                  <div
                    className="truncate rounded bg-warning_primary text-warning px-1.5 py-0.5 text-paragraph-xs cursor-pointer hover:opacity-80 transition-opacity"
                    title={event.label}
                  >
                    {event.label}
                  </div>
                );

                if (!equipment) return <div key={event.id ?? event.label}>{pill}</div>;

                return (
                  <Drawer.Root key={`${equipment.id}-${date.getTime()}`}>
                    <Drawer.Trigger>{pill}</Drawer.Trigger>
                    <EquipmentDrawer equipment={equipment} />
                  </Drawer.Root>
                );
              })}
              {dayEvents.length > 2 && (
                <span className="px-1.5 text-paragraph-xs text-quaternary">
                  +{dayEvents.length - 2} more
                </span>
              )}
            </div>
          </div>
        )}
      />
    </div>
  );
}
