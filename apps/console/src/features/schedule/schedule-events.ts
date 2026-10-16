import type { CalendarEvent } from "@moc/ui/components/display/calendar";
import { groupCalendarEventsByDate } from "@moc/utils/calendar-date-range";
import type { Booking } from "@moc/types/equipment/booking";
import type { Request } from "@moc/types/requests";
import type { VenueBooking } from "@moc/types/venues";
import { routes } from "@/screens/console-routes";
import { getBrowserTimeZone } from "@moc/utils/browser-date-time";
import { parseDateTimeInputToUtcIso } from "@moc/utils/zoned-date-time";
import type { ScheduleData } from "./schedule-service";
import { scheduleEventColors, type ScheduleEvent, type ScheduleEventType } from "./schedule-types";

function parseScheduleDate(date: string | Date, timezone: string): Date {
  if (date instanceof Date) return date;
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return new Date(parseDateTimeInputToUtcIso(`${date}T00:00`, timezone));
    return new Date(date);
  } catch {
    return new Date(Number.NaN);
  }
}

function createEvent(type: ScheduleEventType, kind: ScheduleEvent["kind"], id: string, title: string, date: string | Date, href: string, timezone: string, label: string, extra: Partial<ScheduleEvent> = {}, timing: { endDate?: string | Date; allDay?: boolean } = {}): CalendarEvent<ScheduleEvent> | null {
  const eventDate = parseScheduleDate(date, timezone);
  if (Number.isNaN(eventDate.getTime())) return null;
  const endDate = timing.endDate === undefined ? undefined : parseScheduleDate(timing.endDate, timezone);
  const data: ScheduleEvent = { type, kind, title, id, href, ...extra };
  return { id: `${kind}:${id}:${eventDate.toISOString()}`, date: eventDate, label: `${label} · ${title}`, color: scheduleEventColors[type], data, allDay: timing.allDay ?? (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)), ...(endDate && !Number.isNaN(endDate.getTime()) ? { endDate } : {}) };
}

function isBeforeToday(date: Date, today: Date): boolean {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() < new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
}

function addRequest(events: CalendarEvent<ScheduleEvent>[], request: Request, timezone: string) {
  if (request.status === "archived") return;
  const event = createEvent("request", "request", request.id, request.title, request.dueDate, `/${routes.requests}/${request.id}`, timezone, "Request", { category: request.category, unfinished: request.status !== "completed" }, { allDay: typeof request.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(request.dueDate) });
  if (event) events.push(event);
}

function addEquipment(events: CalendarEvent<ScheduleEvent>[], booking: Booking, timezone: string) {
  if (booking.status === "archived") return;
  const href = `/${routes.bookings}/${booking.id}`;
  const checkout = createEvent("equipment", "equipment-checkout", booking.id, booking.title, booking.checkedOutDate, href, timezone, "Equipment collection");
  const isOutstanding = booking.status !== "returned" && booking.returnedDate === null;
  const returnedDate = booking.returnedDate ?? booking.expectedReturnAt;
  const returnEvent = createEvent("equipment", "equipment-return", booking.id, booking.title, returnedDate, href, timezone, "Equipment return", { outstanding: isOutstanding });
  if (checkout) events.push(checkout);
  if (returnEvent) events.push(returnEvent);
}

function addVenue(events: CalendarEvent<ScheduleEvent>[], booking: VenueBooking, timezone: string) {
  if (booking.status === "cancelled" || booking.status === "rejected") return;
  for (const occurrence of booking.occurrences) {
    const event = createEvent("venue", "venue", `${booking.id}:${occurrence.index}`, booking.title, occurrence.startsAt, `/${routes.venues}/${booking.id}`, timezone, "Venue booking", { venueId: booking.venueId, eventId: booking.eventId ?? (booking.eventOther ? "other" : undefined) }, { endDate: occurrence.endsAt });
    if (event) events.push(event);
  }
}

export function getScheduleEvents(data: Pick<ScheduleData, "requests" | "bookings" | "venueBookings">, timezone = getBrowserTimeZone()): CalendarEvent<ScheduleEvent>[] {
  const events: CalendarEvent<ScheduleEvent>[] = [];
  data.requests.forEach((request) => addRequest(events, request, timezone));
  data.bookings.forEach((booking) => addEquipment(events, booking, timezone));
  data.venueBookings.forEach((booking) => addVenue(events, booking, timezone));
  return events.sort((left, right) => left.date.getTime() - right.date.getTime());
}

export function getAgendaEvents(events: CalendarEvent<ScheduleEvent>[], today = new Date()): CalendarEvent<ScheduleEvent>[] {
  return events.filter((event) => {
    const data = event.data;
    if (!data) return false;
    if (!isBeforeToday(event.date, today)) return true;
    return (data.kind === "request" && data.unfinished === true) || (data.kind === "equipment-return" && data.outstanding === true);
  });
}


export function getAgendaGroups(events: CalendarEvent<ScheduleEvent>[]): { date: Date; events: CalendarEvent<ScheduleEvent>[] }[] {
  return [...groupCalendarEventsByDate(events).values()].map((group) => {
    const event = group[0];
    const date = new Date(event.date.getFullYear(), event.date.getMonth(), event.date.getDate());
    return { date, events: group };
  }).sort((left, right) => left.date.getTime() - right.date.getTime());
}

export type ScheduleFilters = { types: ScheduleEventType[]; categories: string[]; venueEvents: string[]; venues: string[]; search?: string };

export function matchesScheduleFilters(event: CalendarEvent<ScheduleEvent>, filters: ScheduleFilters): boolean {
  const item = event.data;
  if (!item) return false;
  const search = filters.search?.trim().toLocaleLowerCase();
  if (search && !event.label.toLocaleLowerCase().includes(search)) return false;
  if (filters.types.length && !filters.types.includes(item.type)) return false;
  if (item.type === "request" && filters.categories.length && !filters.categories.includes(item.category ?? "")) return false;
  if (item.type === "venue" && filters.venueEvents.length && !filters.venueEvents.includes(item.eventId ?? "other")) return false;
  if (item.type === "venue" && filters.venues.length && !filters.venues.includes(item.venueId ?? "")) return false;
  return true;
}

const eventTimeFormatter = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

export function getEventTime(event: CalendarEvent, includeEnd = false) {
  if (event.allDay) return undefined;
  const start = eventTimeFormatter.format(event.date);
  return includeEnd && event.endDate && event.endDate > event.date ? `${start} – ${eventTimeFormatter.format(event.endDate)}` : start;
}

export function getVisibleEventTitle(event: ScheduleEvent) {
  if (event.kind === "equipment-checkout") return `Collection: ${event.title}`;
  if (event.kind === "equipment-return") return `Return: ${event.title}`;
  return event.title;
}
