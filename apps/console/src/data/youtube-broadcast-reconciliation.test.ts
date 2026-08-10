import { describe, expect, test } from "bun:test"
import { getDeletedBroadcastIds, getUnfinishedTrackedBroadcastIds, isCurrentOrUpcomingBroadcast, type StreamReconciliationRow } from "./youtube-broadcast-reconciliation"

const now = new Date("2026-08-05T12:00:00.000Z")

function tracked(overrides: Partial<StreamReconciliationRow>): StreamReconciliationRow {
  return {
    youtube_broadcast_id: "broadcast-id",
    stream_status: "ready",
    actual_end_time: null,
    ...overrides,
  }
}

describe("isCurrentOrUpcomingBroadcast", () => {
  test("adopts a broadcast that is on air or still to come", () => {
    expect(isCurrentOrUpcomingBroadcast({ stream_status: "live", scheduled_start_time: "2026-03-01T10:00:00.000Z", actual_end_time: null }, now)).toBe(true)
    expect(isCurrentOrUpcomingBroadcast({ stream_status: "ready", scheduled_start_time: "2026-08-05T13:00:00.000Z", actual_end_time: null }, now)).toBe(true)
    // Scheduled half an hour ago and about to be started: inside the grace window.
    expect(isCurrentOrUpcomingBroadcast({ stream_status: "ready", scheduled_start_time: "2026-08-05T11:30:00.000Z", actual_end_time: null }, now)).toBe(true)
  })

  test("refuses the finished and never-started broadcasts YouTube keeps returning", () => {
    expect(isCurrentOrUpcomingBroadcast({ stream_status: "complete", scheduled_start_time: "2026-04-01T10:00:00.000Z", actual_end_time: "2026-04-01T11:00:00.000Z" }, now)).toBe(false)
    // Ended, but the lifecycle status has not caught up.
    expect(isCurrentOrUpcomingBroadcast({ stream_status: "ready", scheduled_start_time: "2026-04-01T10:00:00.000Z", actual_end_time: "2026-04-01T11:00:00.000Z" }, now)).toBe(false)
    // Scheduled in March, never started, still listed as upcoming.
    expect(isCurrentOrUpcomingBroadcast({ stream_status: "ready", scheduled_start_time: "2026-03-01T10:00:00.000Z", actual_end_time: null }, now)).toBe(false)
  })

  test("refuses a broadcast with no usable schedule unless it is live", () => {
    expect(isCurrentOrUpcomingBroadcast({ stream_status: "created", scheduled_start_time: null, actual_end_time: null }, now)).toBe(false)
    expect(isCurrentOrUpcomingBroadcast({ stream_status: "created", scheduled_start_time: "not a date", actual_end_time: null }, now)).toBe(false)
    expect(isCurrentOrUpcomingBroadcast({ stream_status: "live", scheduled_start_time: null, actual_end_time: null }, now)).toBe(true)
  })
})

describe("getUnfinishedTrackedBroadcastIds", () => {
  test("looks up only the tracked streams still in flight and absent remotely", () => {
    const trackedStreams = [
      tracked({ youtube_broadcast_id: "gone-live", stream_status: "live" }),
      tracked({ youtube_broadcast_id: "gone-ready", stream_status: "ready" }),
      tracked({ youtube_broadcast_id: "still-listed", stream_status: "ready" }),
    ]

    expect(getUnfinishedTrackedBroadcastIds(trackedStreams, ["still-listed"])).toEqual(["gone-live", "gone-ready"])
  })

  test("never re-reads a stream already recorded as finished", () => {
    const trackedStreams = [
      tracked({ youtube_broadcast_id: "by-status", stream_status: "complete" }),
      tracked({ youtube_broadcast_id: "by-end-time", actual_end_time: "2026-04-01T11:00:00.000Z" }),
    ]

    expect(getUnfinishedTrackedBroadcastIds(trackedStreams, [])).toEqual([])
  })
})

describe("getDeletedBroadcastIds", () => {
  test("treats an id the lookup did not answer for as deleted on YouTube", () => {
    expect(getDeletedBroadcastIds(["kept", "deleted"], ["kept"])).toEqual(["deleted"])
    expect(getDeletedBroadcastIds(["deleted"], [])).toEqual(["deleted"])
  })

  test("claims nothing when no lookup was made, whatever came back", () => {
    // The candidate list is the only evidence of what was actually asked about,
    // so an empty one can never authorize a deletion.
    expect(getDeletedBroadcastIds([], [])).toEqual([])
    expect(getDeletedBroadcastIds([], ["unrelated"])).toEqual([])
  })

  test("ignores broadcasts returned that were never asked about", () => {
    expect(getDeletedBroadcastIds(["asked"], ["asked", "extra"])).toEqual([])
  })
})
