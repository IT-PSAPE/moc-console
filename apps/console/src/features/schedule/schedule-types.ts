import type { CalendarEvent } from "@moc/ui/components/display/calendar";

export type ScheduleEventType = "request" | "equipment" | "venue" | "stream" | "meeting" | "checklist" | "message";

export const scheduleTypeOptions: { value: ScheduleEventType | "all"; label: string }[] = [
  { value: "all", label: "All items" },
  { value: "request", label: "Requests" },
  { value: "equipment", label: "Equipment bookings" },
  { value: "venue", label: "Venue bookings" },
  { value: "stream", label: "Streams" },
  { value: "meeting", label: "Meetings" },
  { value: "checklist", label: "Checklists" },
  { value: "message", label: "Scheduled messages" },
];

export const scheduleEventColors: Record<ScheduleEventType, NonNullable<CalendarEvent["color"]>> = {
  request: "blue",
  equipment: "orange",
  venue: "purple",
  stream: "red",
  meeting: "green",
  checklist: "yellow",
  message: "gray",
};
