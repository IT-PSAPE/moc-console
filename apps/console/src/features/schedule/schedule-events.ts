import type { CalendarEvent } from "@moc/ui/components/display/calendar";
import { getZoomMeetingCalendarOccurrences } from "@/features/streams/zoom-meeting-calendar-occurrences";
import { routes } from "@/screens/console-routes";
import { getBrowserTimeZone } from "@moc/utils/browser-date-time";
import { parseDateTimeInputToUtcIso } from "@moc/utils/zoned-date-time";
import type { ScheduleData } from "./schedule-service";

import { scheduleEventColors, type ScheduleEventType } from "./schedule-types";
export type ScheduleEvent = { type: ScheduleEventType; title: string; href: string; id: string };

function parseScheduleDate(date: string | Date, timezone: string): Date {
  if (date instanceof Date) return date;
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return new Date(parseDateTimeInputToUtcIso(`${date}T00:00`, timezone));
    return new Date(date);
  } catch {
    return new Date(Number.NaN);
  }
}

function createEvent(type: ScheduleEventType, id: string, title: string, date: string | Date, href: string, timezone: string, label: string): CalendarEvent<ScheduleEvent> | null {
  const eventDate = parseScheduleDate(date, timezone);
  if (Number.isNaN(eventDate.getTime())) return null;
  return { id: `${type}:${id}:${eventDate.toISOString()}`, date: eventDate, label: `${label} · ${title}`, color: scheduleEventColors[type], data: { type, title, id, href } };
}

export function getScheduleEvents(data: ScheduleData, month: Date, timezone = getBrowserTimeZone()): CalendarEvent<ScheduleEvent>[] {
  const events: CalendarEvent<ScheduleEvent>[] = [];
  for (const request of data.requests) {
    const event = createEvent("request", request.id, request.title, request.dueDate, `/${routes.requests}/${request.id}`, timezone, "Request");
    if (event) events.push(event);
  }
  for (const booking of data.bookings) {
    if (booking.status === "archived") continue;
    const booked = createEvent("equipment", `${booking.id}:booking`, booking.title, booking.checkedOutDate, `/${routes.bookings}/${booking.id}`, timezone, "Equipment booking");
    const returned = createEvent("equipment", `${booking.id}:return`, booking.title, booking.expectedReturnAt, `/${routes.bookings}/${booking.id}`, timezone, "Equipment return");
    if (booked) events.push(booked);
    if (returned) events.push(returned);
  }
  for (const booking of data.venueBookings) {
    if (booking.status === "cancelled" || booking.status === "rejected") continue;
    for (const occurrence of booking.occurrences) {
      const event = createEvent("venue", `${booking.id}:${occurrence.index}`, booking.title, occurrence.startsAt, `/${routes.venues}/${booking.id}`, timezone, "Venue booking");
      if (event) events.push(event);
    }
  }
  for (const stream of data.streams) {
    if (!stream.scheduledStartTime) continue;
    const event = createEvent("stream", stream.id, stream.title, stream.scheduledStartTime, `/${routes.streams}/stream/${stream.id}`, timezone, "Stream");
    if (event) events.push(event);
  }
  for (const meeting of data.meetings) {
    for (const occurrence of getZoomMeetingCalendarOccurrences(meeting, month, timezone)) {
      const event = createEvent("meeting", `${meeting.id}:${occurrence.toISOString()}`, meeting.topic, occurrence, `/${routes.streams}/meeting/${meeting.id}`, timezone, "Meeting");
      if (event) events.push(event);
    }
  }
  for (const checklist of data.checklists) {
    if (checklist.kind !== "instance" || !checklist.scheduledAt) continue;
    const event = createEvent("checklist", checklist.id, checklist.name, checklist.scheduledAt, `/${routes.checklists}/${checklist.id}`, timezone, "Checklist");
    if (event) events.push(event);
  }
  for (const message of data.messages) {
    if (message.state === "cancelled") continue;
    // Message date/time variables use expiry, independently of the send timestamp.
    const event = createEvent("message", message.id, message.fields.title, message.expires_at, `/${routes.scheduledMessages}`, timezone, "Scheduled message");
    if (event) events.push(event);
  }
  return events;
}
