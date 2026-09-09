import { describe, expect, test } from "bun:test"
import type { Stream } from "@moc/types/streams/stream"
import type { ZoomMeeting } from "@moc/types/streams/zoom"
import { createStreamCalendarEvents, createStreamListEntries } from "./stream-list-entry"

function localTimestamp(year: number, month: number, day: number, hour = 10): string {
  return new Date(year, month, day, hour).toISOString()
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

function stream(overrides: Partial<Stream>): Stream {
  return {
    id: "stream-id", workspaceId: "workspace-id", youtubeBroadcastId: "broadcast-id", youtubeStreamId: "youtube-stream-id",
    title: "Stream", description: "", thumbnailUrl: null, privacyStatus: "unlisted", isForKids: false,
    scheduledStartTime: localTimestamp(2026, 7, 10), actualStartTime: null, actualEndTime: null, streamStatus: "ready",
    streamUrl: null, streamKey: null, ingestionUrl: null, categoryId: null, tags: [], latencyPreference: "normal",
    enableDvr: true, enableEmbed: true, enableAutoStart: false, enableAutoStop: false, playlistId: null,
    createdBy: "user-id", createdAt: localTimestamp(2026, 7, 1), updatedAt: localTimestamp(2026, 7, 1),
    ...overrides,
  }
}

function meeting(overrides: Partial<ZoomMeeting>): ZoomMeeting {
  return {
    id: "meeting-id", workspaceId: "workspace-id", zoomMeetingId: 123, topic: "Meeting", description: "",
    meetingType: "scheduled", startTime: localTimestamp(2026, 7, 3), duration: 30, timezone: "Africa/Johannesburg",
    joinUrl: null, password: null, recurrenceType: "none", recurrenceInterval: null, recurrenceDays: null,
    waitingRoom: true, muteOnEntry: true, continuousChat: false, createdBy: "user-id",
    createdAt: localTimestamp(2026, 7, 1), updatedAt: localTimestamp(2026, 7, 1),
    ...overrides,
  }
}

describe("createStreamCalendarEvents", () => {
  test("places streams on their scheduled dates instead of their shared creation date", () => {
    const streams = [
      stream({ id: "first", scheduledStartTime: localTimestamp(2026, 7, 10) }),
      stream({ id: "second", scheduledStartTime: localTimestamp(2026, 7, 15) }),
    ]

    const events = createStreamCalendarEvents(createStreamListEntries(streams, []), new Date(2026, 7, 1))

    expect(events.map((event) => dateKey(event.date))).toEqual(["2026-8-10", "2026-8-15"])
  })

  test("places one-time Zoom meetings on their scheduled start date", () => {
    const meetings = [meeting({ startTime: localTimestamp(2026, 7, 22), createdAt: localTimestamp(2026, 7, 1) })]

    const events = createStreamCalendarEvents(createStreamListEntries([], meetings), new Date(2026, 7, 1))

    expect(events.map((event) => dateKey(event.date))).toEqual(["2026-8-22"])
  })

  test("repeats weekly Zoom meetings throughout the visible calendar", () => {
    const meetings = [meeting({ recurrenceType: "weekly", recurrenceInterval: 1, recurrenceDays: "2" })]

    const events = createStreamCalendarEvents(createStreamListEntries([], meetings), new Date(2026, 7, 1))

    expect(events.map((event) => dateKey(event.date))).toEqual([
      "2026-8-3", "2026-8-10", "2026-8-17", "2026-8-24", "2026-8-31",
    ])
  })

  test("honors daily and monthly recurrence intervals", () => {
    const meetings = [
      meeting({ id: "daily", recurrenceType: "daily", recurrenceInterval: 2, startTime: localTimestamp(2026, 7, 30) }),
      meeting({ id: "monthly", recurrenceType: "monthly", recurrenceInterval: 2, recurrenceDays: "15", startTime: localTimestamp(2026, 6, 15) }),
    ]

    const events = createStreamCalendarEvents(createStreamListEntries([], meetings), new Date(2026, 8, 1))
    const dailyDates = events.filter((event) => event.data?.id === "zoom-daily").map((event) => dateKey(event.date))
    const monthlyDates = events.filter((event) => event.data?.id === "zoom-monthly").map((event) => dateKey(event.date))

    expect(dailyDates.slice(0, 3)).toEqual(["2026-8-30", "2026-9-1", "2026-9-3"])
    expect(monthlyDates).toEqual(["2026-9-15"])
  })
})
