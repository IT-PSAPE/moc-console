import type { CalendarEvent } from "@moc/ui/components/display/calendar";
import type { CalendarView } from "@moc/sdk/users";
import type { Booking } from "@moc/types/equipment/booking";
import type { Request } from "@moc/types/requests";
import type { VenueBooking } from "@moc/types/venues";

export type ScheduleData = {
  bookings: Booking[];
  requests: Request[];
  venueBookings: VenueBooking[];
};

export type ScheduleEventType = "request" | "equipment" | "venue";
export type ScheduleItemType = "all" | ScheduleEventType;
export type ScheduleView = CalendarView;
export type ScheduleItemKind = "request" | "equipment-checkout" | "equipment-return" | "venue";

export type ScheduleEvent = {
  type: ScheduleEventType;
  kind: ScheduleItemKind;
  title: string;
  href: string;
  id: string;
  category?: string;
  venueId?: string;
  eventId?: string;
  unfinished?: boolean;
  outstanding?: boolean;
};

export const scheduleEventColors: Record<ScheduleEventType, NonNullable<CalendarEvent["color"]>> = {
  request: "blue",
  equipment: "orange",
  venue: "purple",
};
