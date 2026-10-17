import type { CalendarEvent } from "@moc/ui/components/display/calendar";
import type { CalendarView } from "@moc/sdk/users";

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
