import { describe, expect, test } from "vitest";
import { getAgendaEvents, getAgendaGroups, getScheduleEvents, matchesScheduleFilters } from "../../../../../apps/console/src/features/schedule/schedule-events";
import type { ScheduleData } from "../../../../../apps/console/src/features/schedule/schedule-service";

const baseData: ScheduleData = {
  requests: [
    { id: "late", title: "Late request", dueDate: "2020-01-01", status: "in_progress", category: "crew" } as ScheduleData["requests"][number],
    { id: "done", title: "Done request", dueDate: "2020-01-01", status: "completed", category: "crew" } as ScheduleData["requests"][number],
    { id: "future", title: "Future request", dueDate: "2030-01-01", status: "not_started", category: "crew" } as ScheduleData["requests"][number],
    { id: "archived", title: "Archived request", dueDate: "2030-01-01", status: "archived", category: "crew" } as ScheduleData["requests"][number],
  ],
  bookings: [
    { id: "open", title: "Outstanding", checkedOutDate: "2020-01-01", expectedReturnAt: "2020-01-02", returnedDate: null, status: "checked_out" } as ScheduleData["bookings"][number],
    { id: "archived-booking", title: "Archived booking", checkedOutDate: "2030-01-01", expectedReturnAt: "2030-01-02", returnedDate: null, status: "archived" } as ScheduleData["bookings"][number],
    { id: "returned", title: "Returned", checkedOutDate: "2020-01-01", expectedReturnAt: "2020-01-02", returnedDate: "2020-01-03", status: "returned" } as ScheduleData["bookings"][number],
  ],
  venueBookings: [
    { id: "past-venue", title: "Past venue", venueId: "room-a", eventId: "event-a", status: "approved", occurrences: [{ index: 0, startsAt: "2020-01-01T10:00:00.000Z", endsAt: "2020-01-01T11:00:00.000Z" }] } as ScheduleData["venueBookings"][number],
    { id: "cancelled", title: "Cancelled", venueId: "room-a", eventId: "event-a", status: "cancelled", occurrences: [{ index: 0, startsAt: "2030-01-01T10:00:00.000Z", endsAt: "2030-01-01T11:00:00.000Z" }] } as ScheduleData["venueBookings"][number],
    { id: "rejected", title: "Rejected", venueId: "room-a", eventId: "event-a", status: "rejected", occurrences: [{ index: 0, startsAt: "2030-01-01T10:00:00.000Z", endsAt: "2030-01-01T11:00:00.000Z" }] } as ScheduleData["venueBookings"][number],
    { id: "future-venue", title: "Future venue", venueId: "room-a", eventId: "event-a", status: "approved", occurrences: [{ index: 0, startsAt: "2030-01-01T10:00:00.000Z", endsAt: "2030-01-01T11:00:00.000Z" }] } as ScheduleData["venueBookings"][number],
  ],
};

describe("Work agenda events", () => {
  test("groups items by local calendar day in chronological order", () => {
    const groups = getAgendaGroups([
      { date: new Date(2026, 9, 16, 9), label: "Tomorrow" },
      { date: new Date(2026, 9, 15, 23), label: "Late today" },
      { date: new Date(2026, 9, 15, 1), label: "Early today" },
    ]);
    expect(groups.map(group => group.date.getDate())).toEqual([15, 16]);
    expect(groups[0].events.map(event => event.label)).toEqual(["Late today", "Early today"]);
    expect(groups[1].events.map(event => event.label)).toEqual(["Tomorrow"]);
  });
  test("keeps future work, overdue unfinished requests and outstanding returns", () => {
    const events = getScheduleEvents(baseData, "UTC");
    const agenda = getAgendaEvents(events, new Date("2025-01-01T12:00:00.000Z"));
    expect(agenda.map(event => event.data?.id)).toEqual(expect.arrayContaining(["future", "future-venue:0", "open"]));
    expect(agenda.some(event => event.data?.id === "late" && event.data.kind === "request")).toBe(true);
    expect(agenda.some(event => event.data?.id === "open" && event.data.kind === "equipment-checkout")).toBe(false);
  });

  test("excludes completed, archived, returned, cancelled and rejected work from overdue agenda items", () => {
    const agenda = getAgendaEvents(getScheduleEvents(baseData, "UTC"), new Date("2025-01-01T12:00:00.000Z"));
    expect(agenda.some(event => event.data?.id === "done")).toBe(false);
    expect(agenda.some(event => event.data?.id === "archived")).toBe(false);
    expect(agenda.some(event => event.data?.id === "returned")).toBe(false);
    expect(agenda.some(event => event.data?.id === "past-venue:0")).toBe(false);
    expect(agenda.some(event => event.data?.id === "cancelled:0")).toBe(false);
    expect(agenda.some(event => event.data?.id === "rejected:0")).toBe(false);
    expect(agenda.some(event => event.data?.id === "archived-booking")).toBe(false);
  });

  test("creates distinct equipment collection and return events", () => {
    const events = getScheduleEvents(baseData, "UTC").filter(event => event.data?.id === "open");
    expect(events.map(event => event.data?.kind)).toEqual(["equipment-checkout", "equipment-return"]);
    expect(events.every(event => event.allDay)).toBe(true);
    const returned = getScheduleEvents(baseData, "UTC").find(event => event.data?.id === "returned" && event.data.kind === "equipment-return");
    expect(returned?.date.toISOString()).toBe("2020-01-03T00:00:00.000Z");
  });

  test("applies OR within each selected dimension and AND across dimensions", () => {
    const events = getScheduleEvents(baseData, "UTC");
    const futureRequest = events.find(event => event.data?.id === "future");
    const futureVenue = events.find(event => event.data?.id === "future-venue:0");
    expect(matchesScheduleFilters(futureRequest!, { types: ["request", "venue"], categories: ["crew", "stage"], venueEvents: [], venues: [] })).toBe(true);
    expect(matchesScheduleFilters(futureVenue!, { types: ["venue"], categories: ["crew"], venueEvents: [], venues: [] })).toBe(true);
    expect(matchesScheduleFilters(futureVenue!, { types: ["request", "venue"], categories: [], venueEvents: ["event-a", "event-b"], venues: ["room-a"] })).toBe(true);
    expect(matchesScheduleFilters(futureVenue!, { types: ["venue"], categories: [], venueEvents: ["event-a"], venues: ["room-b"] })).toBe(false);
    expect(matchesScheduleFilters(futureRequest!, { types: ["request"], categories: ["stage"], venueEvents: [], venues: [] })).toBe(false);
    expect(matchesScheduleFilters(futureVenue!, { types: ["request"], categories: [], venueEvents: ["event-a"], venues: [] })).toBe(false);
    expect(matchesScheduleFilters(futureRequest!, { types: ["request", "venue"], categories: ["crew"], venueEvents: ["event-a"], venues: ["room-a"] })).toBe(true);
  });

  test("searches work labels without case or surrounding whitespace and combines with the selected type", () => {
    const events = getScheduleEvents(baseData, "UTC");
    const filters = { types: [], categories: [], venueEvents: [], venues: [], search: "  FUTURE  " };
    expect(events.filter(event => matchesScheduleFilters(event, filters)).map(event => event.data?.id)).toEqual(["future", "future-venue:0"]);
    expect(events.filter(event => matchesScheduleFilters(event, { ...filters, types: ["venue"] })).map(event => event.data?.id)).toEqual(["future-venue:0"]);
    expect(events.filter(event => matchesScheduleFilters(event, { ...filters, search: "nothing matches" }))).toEqual([]);
    expect(events.filter(event => matchesScheduleFilters(event, { ...filters, search: "  " }))).toHaveLength(events.length);
  });

  test("keeps date-only request dates on the selected browser timezone day", () => {
    const request = { ...baseData.requests[0], id: "timezone", dueDate: "2026-10-16" };
    const events = getScheduleEvents({ ...baseData, requests: [request] }, "America/Los_Angeles");
    const event = events.find(item => item.data?.id === "timezone");
    expect(event).toBeDefined();
    expect(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(event!.date)).toBe("2026-10-16");
    expect(event?.allDay).toBe(true);
  });

  test("preserves venue occurrence end times for calendar overlap and timed labels", () => {
    const event = getScheduleEvents(baseData, "UTC").find(item => item.data?.id === "future-venue:0");
    expect(event?.date.toISOString()).toBe("2030-01-01T10:00:00.000Z");
    expect(event?.endDate?.toISOString()).toBe("2030-01-01T11:00:00.000Z");
    expect(event?.allDay).toBe(false);
  });
});
