import { describe, expect, it } from "vitest";
import type { ScheduledOccurrence } from "@moc/notifications";
import type { Booking } from "@moc/types/equipment/booking";
import type { Checklist } from "@moc/types/checklists";
import type { Request } from "@moc/types/requests";
import type { VenueBooking } from "@moc/types/venues";
import type { Stream } from "@moc/types/streams/stream";
import type { ZoomMeeting } from "@moc/types/streams/zoom";
import { getScheduleEvents } from "../../../../../apps/console/src/features/schedule/schedule-events";
import { formatScheduleMonth, parseScheduleMonth, updateScheduleMonthQuery } from "../../../../../apps/console/src/features/schedule/schedule-query";
import { getZoomMeetingCalendarOccurrences } from "../../../../../apps/console/src/features/streams/zoom-meeting-calendar-occurrences";
import { formatUtcIsoInTimezone } from "../../../../../packages/utils/src/zoned-date-time";

function makeRequest(id: string, dueDate: string, status: Request["status"] = "not_started"): Request {
  return { id, title: id, priority: "medium", status, category: "other", createdAt: "2026-10-01T08:00:00.000Z", updatedAt: "2026-10-01T08:00:00.000Z", dueDate, requestedBy: "Jordan", who: "", what: "", when: "", where: "", why: "", how: "" };
}

function emptyScheduleData() {
  return { bookings: [] as Booking[], checklists: [] as Checklist[], requests: [] as Request[], streams: [] as Stream[], meetings: [] as ZoomMeeting[], venueBookings: [] as VenueBooking[], messages: [] as ScheduledOccurrence[] };
}

describe("schedule", () => {
  it("parses URL months at year boundaries and retains other route filters when changing months", () => {
    const fallback = new Date(2026, 5, 20);
    const january = parseScheduleMonth("2027-01", fallback);
    const invalidMonth = parseScheduleMonth("2027-13", fallback);
    const nextParams = updateScheduleMonthQuery(new URLSearchParams("type=venue&keep=1"), new Date(2026, 11, 31));

    expect([january.getFullYear(), january.getMonth(), january.getDate()]).toEqual([2027, 0, 1]);
    expect([invalidMonth.getFullYear(), invalidMonth.getMonth(), invalidMonth.getDate()]).toEqual([2026, 5, 1]);
    expect(formatScheduleMonth(new Date(2026, 11, 31))).toBe("2026-12");
    expect(nextParams.get("month")).toBe("2026-12");
    expect(nextParams.get("type")).toBe("venue");
    expect(nextParams.get("keep")).toBe("1");
  });

  it("creates distinct same-day equipment booking and return entries and ignores checklist templates", () => {
    const booking: Booking = {
      id: "booking-1",
      trackingCode: "EQ-001",
      title: "Camera kit",
      bookedBy: "Jordan",
      checkedOutDate: "2026-10-10T08:00:00.000Z",
      expectedReturnAt: "2026-10-10T08:00:00.000Z",
      returnedDate: null,
      duration: "2 days",
      notes: "",
      status: "checked_out",
      items: [],
      createdAt: "2026-10-09T08:00:00.000Z",
    };
    const checklist = (id: string, kind: Checklist["kind"]): Checklist => ({
      id, kind, name: "Opening checklist", description: "", scheduledAt: "2026-10-11T08:00:00.000Z", items: [], sections: [], createdAt: "2026-10-09T08:00:00.000Z", updatedAt: "2026-10-09T08:00:00.000Z",
    });

    const events = getScheduleEvents({ bookings: [booking], checklists: [checklist("template-1", "template"), checklist("run-1", "instance")], requests: [], streams: [], meetings: [], venueBookings: [], messages: [] }, new Date(2026, 9, 1), "UTC");

    expect(events.map((event) => event.label)).toEqual([
      "Equipment booking · Camera kit",
      "Equipment return · Camera kit",
      "Checklist · Opening checklist",
    ]);
    expect(events[0]?.date.toISOString()).toBe(booking.checkedOutDate);
    expect(events[1]?.date.toISOString()).toBe(booking.expectedReturnAt);
    expect(events[0]?.date.toISOString()).toBe(events[1]?.date.toISOString());
    expect(events[0]?.id).not.toBe(events[1]?.id);
    expect(events[2]?.data?.href).toBe("/checklists/run-1");
  });

  it("parses date-only request deadlines in the requested timezone", () => {
    const events = getScheduleEvents({
      ...emptyScheduleData(),
      requests: [
        makeRequest("upcoming", "2026-10-18"),
        makeRequest("later", "2026-10-19"),
        makeRequest("overdue", "2026-10-11"),
        makeRequest("completed", "2026-10-11", "completed"),
        { ...makeRequest("high", "2026-10-20"), priority: "high" },
      ],
    }, new Date(2026, 9, 1), "Africa/Johannesburg");
    expect(events.find((event) => event.data?.id === "upcoming")?.date.toISOString()).toBe("2026-10-17T22:00:00.000Z");
    expect(events.find((event) => event.data?.id === "later")?.date.toISOString()).toBe("2026-10-18T22:00:00.000Z");
    expect(events.find((event) => event.data?.id === "completed")?.date.toISOString()).toBe("2026-10-10T22:00:00.000Z");
  });

  it("excludes archived equipment and keeps planned return dates after completion", () => {
    const booking = (id: string, status: Booking["status"], returnedDate: string | null = null): Booking => ({
      id, trackingCode: id, title: id, bookedBy: "Jordan", checkedOutDate: "2026-10-10T08:00:00.000Z", expectedReturnAt: "2026-10-11T08:00:00.000Z", returnedDate, duration: "1 day", notes: "", status, items: [], createdAt: "2026-10-09T08:00:00.000Z",
    });
    const events = getScheduleEvents({ ...emptyScheduleData(), bookings: [booking("late", "checked_out"), booking("returned", "returned", "2026-10-12T09:00:00.000Z"), booking("archived", "archived")] }, new Date(2026, 9, 1), "UTC");
    const returnEvents = events.filter((event) => event.label.startsWith("Equipment return"));

    expect(events.some((event) => event.data?.id.includes("archived"))).toBe(false);
    expect(returnEvents.find((event) => event.data?.id === "late:return")?.date.toISOString()).toBe("2026-10-11T08:00:00.000Z");
    expect(returnEvents.find((event) => event.data?.id === "returned:return")?.date.toISOString()).toBe("2026-10-11T08:00:00.000Z");
  });

  it("retains the planned return date for completed bookings and skips invalid dates", () => {
    const returned: Booking = {
      id: "returned-null-date", trackingCode: "EQ-3", title: "Returned camera", bookedBy: "Jordan", checkedOutDate: "2026-10-10T08:00:00.000Z", expectedReturnAt: "2026-10-11T08:00:00.000Z", returnedDate: null, duration: "1 day", notes: "", status: "returned", items: [], createdAt: "2026-10-09T08:00:00.000Z",
    };
    const events = getScheduleEvents({ ...emptyScheduleData(), bookings: [returned], requests: [makeRequest("invalid", "not-a-date")] }, new Date(2026, 9, 1), "Africa/Johannesburg");
    expect(events.some((event) => event.data?.id === "invalid")).toBe(false);
    expect(events.find((event) => event.data?.id === "returned-null-date:return")?.date.toISOString()).toBe(returned.expectedReturnAt);
  });

  it("keeps pending and approved venues but omits rejected or cancelled reservations", () => {
    const booking = (id: string, status: VenueBooking["status"]): VenueBooking => ({
      id, workspaceId: "workspace-1", venueId: "venue-1", venueName: "Studio", venueDescription: null, eventId: null, eventName: null, eventOther: null, trackingCode: id, title: id, requestedBy: "Jordan", notes: null, status, startsAt: "2026-10-14T08:00:00.000Z", endsAt: "2026-10-14T09:00:00.000Z", recurrence: null, occurrences: [{ index: 0, startsAt: "2026-10-14T08:00:00.000Z", endsAt: "2026-10-14T09:00:00.000Z" }], cancelledAt: null, cancelledBy: null, cancelReason: null, approvedAt: null, approvedBy: null, rejectedAt: null, rejectedBy: null, createdAt: "2026-10-01T08:00:00.000Z", updatedAt: "2026-10-01T08:00:00.000Z",
    });
    const events = getScheduleEvents({ ...emptyScheduleData(), venueBookings: [booking("pending", "auto"), booking("approved", "approved"), booking("rejected", "rejected"), booking("cancelled", "cancelled")] }, new Date(2026, 9, 1), "Africa/Johannesburg");

    expect(events.find((event) => event.data?.id === "pending:0")?.label).toBe("Venue booking · pending");
    expect(events.find((event) => event.data?.id === "approved:0")?.label).toBe("Venue booking · approved");
    expect(events.some((event) => event.data?.id === "rejected:0")).toBe(false);
    expect(events.some((event) => event.data?.id === "cancelled:0")).toBe(false);
  });

  it("keeps venue booking occurrences regardless of whether their dates are historical", () => {
    const booking = (id: string, startsAt: string, endsAt: string): VenueBooking => ({
      id, workspaceId: "workspace-1", venueId: "venue-1", venueName: "Studio", venueDescription: null, eventId: null, eventName: null, eventOther: null, trackingCode: id, title: id, requestedBy: "Jordan", notes: null, status: "auto", startsAt, endsAt, recurrence: null, occurrences: [{ index: 0, startsAt, endsAt }], cancelledAt: null, cancelledBy: null, cancelReason: null, approvedAt: null, approvedBy: null, rejectedAt: null, rejectedBy: null, createdAt: "2026-10-01T08:00:00.000Z", updatedAt: "2026-10-01T08:00:00.000Z",
    });
    const events = getScheduleEvents({ ...emptyScheduleData(), venueBookings: [booking("past-auto", "2026-10-10T08:00:00.000Z", "2026-10-10T09:00:00.000Z"), booking("active-auto", "2026-10-12T09:00:00.000Z", "2026-10-12T11:00:00.000Z")] }, new Date(2026, 9, 1), "Africa/Johannesburg");

    expect(events.find((event) => event.data?.id === "past-auto:0")?.date.toISOString()).toBe("2026-10-10T08:00:00.000Z");
    expect(events.find((event) => event.data?.id === "active-auto:0")?.date.toISOString()).toBe("2026-10-12T09:00:00.000Z");
  });

  it("keeps recurring Zoom meeting wall time through daylight saving changes", () => {
    const meeting: ZoomMeeting = {
      id: "meeting-1", workspaceId: "workspace-1", zoomMeetingId: 123, topic: "Weekly sync", description: "", meetingType: "recurring_fixed", startTime: "2026-03-01T17:00:00.000Z", duration: 30, timezone: "America/Los_Angeles", recurrenceType: "weekly", recurrenceInterval: 1, recurrenceDays: "1", waitingRoom: false, muteOnEntry: false, continuousChat: false, createdBy: "user-1", createdAt: "2026-02-01T00:00:00.000Z", updatedAt: "2026-02-01T00:00:00.000Z",
    };
    const occurrences = getZoomMeetingCalendarOccurrences(meeting, new Date(2026, 2, 1), "Africa/Johannesburg");
    const localTimes = occurrences.map((occurrence) => formatUtcIsoInTimezone(occurrence.toISOString(), meeting.timezone, { timeStyle: "short" }));

    expect(occurrences).toHaveLength(6);
    expect(new Set(localTimes)).toEqual(new Set(["9:00 AM"]));
  });

  it("includes streams with scheduled start dates regardless of status", () => {
    const stream = (id: string, streamStatus: Stream["streamStatus"]): Stream => ({
      id, workspaceId: "workspace-1", youtubeBroadcastId: id, youtubeStreamId: id, title: id, description: "", thumbnailUrl: null, privacyStatus: "private", isForKids: false, scheduledStartTime: "2026-10-14T08:00:00.000Z", actualStartTime: null, actualEndTime: null, streamStatus, streamUrl: null, streamKey: null, ingestionUrl: null, categoryId: null, tags: [], latencyPreference: "normal", enableDvr: true, enableEmbed: false, enableAutoStart: false, enableAutoStop: false, playlistId: null, createdBy: "user-1", createdAt: "2026-10-01T08:00:00.000Z", updatedAt: "2026-10-01T08:00:00.000Z",
    });
    const events = getScheduleEvents({ ...emptyScheduleData(), streams: [stream("upcoming", "ready"), stream("complete", "complete")] }, new Date(2026, 9, 1), "Africa/Johannesburg");

    expect(events.find((event) => event.data?.id === "upcoming")?.label).toBe("Stream · upcoming");
    expect(events.find((event) => event.data?.id === "complete")?.label).toBe("Stream · complete");
  });
  it("places scheduled messages at their displayed event time, excluding cancelled messages and send dates", () => {
    const message: ScheduledOccurrence = {
      id: "message-1", workspace_id: "workspace-1", schedule_id: "schedule-1", occurrence_on: "2026-10-12",
      send_on: "2026-10-12T08:00:00.000Z", expires_at: "2026-10-18T08:00:00.000Z",
      fields: { title: "Sunday service" }, body: "{{title}} {{date}} {{time}}", message_type: "announcement", require_arrival: false,
      state: "sent", revision: 1, synced_revision: 1, telegram_message_id: 12, last_sync_error: null,
    };
    const events = getScheduleEvents({ ...emptyScheduleData(), messages: [message, { ...message, id: "cancelled", state: "cancelled" }, { ...message, id: "invalid-date", expires_at: "invalid" }] }, new Date(2026, 9, 1), "Africa/Johannesburg");

    expect(events).toHaveLength(1);
    expect(events[0]?.date.toISOString()).toBe(message.expires_at);
    expect(events[0]?.label).toBe("Scheduled message · Sunday service");
    expect(events[0]?.color).toBe("gray");
    expect(events[0]?.data?.href).toBe("/scheduled-messages");
  });

});
