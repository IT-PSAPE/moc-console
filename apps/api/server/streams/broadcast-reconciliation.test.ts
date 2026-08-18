import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  getDeletedBroadcastIds,
  getUnfinishedTrackedBroadcastIds,
  isCurrentOrUpcomingBroadcast,
  type StreamReconciliationRow,
} from "./broadcast-reconciliation.js"

const now = new Date("2026-08-05T12:00:00.000Z")

function tracked(overrides: Partial<StreamReconciliationRow>): StreamReconciliationRow {
  return { youtube_broadcast_id: "broadcast-id", stream_status: "ready", actual_end_time: null, ...overrides }
}

describe("isCurrentOrUpcomingBroadcast", () => {
  it("adopts a broadcast that is on air or still to come", () => {
    assert.equal(isCurrentOrUpcomingBroadcast({ stream_status: "live", scheduled_start_time: "2026-03-01T10:00:00.000Z", actual_end_time: null }, now), true)
    assert.equal(isCurrentOrUpcomingBroadcast({ stream_status: "ready", scheduled_start_time: "2026-08-05T13:00:00.000Z", actual_end_time: null }, now), true)
    // Scheduled half an hour ago and about to be started: inside the grace window.
    assert.equal(isCurrentOrUpcomingBroadcast({ stream_status: "ready", scheduled_start_time: "2026-08-05T11:30:00.000Z", actual_end_time: null }, now), true)
  })

  it("refuses the finished and never-started broadcasts YouTube keeps returning", () => {
    assert.equal(isCurrentOrUpcomingBroadcast({ stream_status: "complete", scheduled_start_time: "2026-04-01T10:00:00.000Z", actual_end_time: "2026-04-01T11:00:00.000Z" }, now), false)
    // Ended, but the lifecycle status has not caught up.
    assert.equal(isCurrentOrUpcomingBroadcast({ stream_status: "ready", scheduled_start_time: "2026-04-01T10:00:00.000Z", actual_end_time: "2026-04-01T11:00:00.000Z" }, now), false)
    // Scheduled in March, never started, still listed as upcoming.
    assert.equal(isCurrentOrUpcomingBroadcast({ stream_status: "ready", scheduled_start_time: "2026-03-01T10:00:00.000Z", actual_end_time: null }, now), false)
  })

  it("refuses a broadcast with no usable schedule unless it is live", () => {
    assert.equal(isCurrentOrUpcomingBroadcast({ stream_status: "created", scheduled_start_time: null, actual_end_time: null }, now), false)
    assert.equal(isCurrentOrUpcomingBroadcast({ stream_status: "created", scheduled_start_time: "not a date", actual_end_time: null }, now), false)
    assert.equal(isCurrentOrUpcomingBroadcast({ stream_status: "live", scheduled_start_time: null, actual_end_time: null }, now), true)
  })
})

describe("getUnfinishedTrackedBroadcastIds", () => {
  it("looks up only the tracked streams still in flight and absent remotely", () => {
    const trackedStreams = [
      tracked({ youtube_broadcast_id: "gone-live", stream_status: "live" }),
      tracked({ youtube_broadcast_id: "gone-ready" }),
      tracked({ youtube_broadcast_id: "still-listed" }),
    ]

    assert.deepEqual(getUnfinishedTrackedBroadcastIds(trackedStreams, ["still-listed"]), ["gone-live", "gone-ready"])
  })

  it("never re-reads a stream already recorded as finished", () => {
    const trackedStreams = [
      tracked({ youtube_broadcast_id: "by-status", stream_status: "complete" }),
      tracked({ youtube_broadcast_id: "by-end-time", actual_end_time: "2026-04-01T11:00:00.000Z" }),
    ]

    assert.deepEqual(getUnfinishedTrackedBroadcastIds(trackedStreams, []), [])
  })
})

describe("getDeletedBroadcastIds", () => {
  it("treats an id the lookup did not answer for as deleted on YouTube", () => {
    assert.deepEqual(getDeletedBroadcastIds(["kept", "deleted"], ["kept"]), ["deleted"])
    assert.deepEqual(getDeletedBroadcastIds(["deleted"], []), ["deleted"])
  })

  it("claims nothing when no lookup was made, whatever came back", () => {
    // The candidate list is the only evidence of what was actually asked about,
    // so an empty one can never authorize a deletion.
    assert.deepEqual(getDeletedBroadcastIds([], []), [])
    assert.deepEqual(getDeletedBroadcastIds([], ["unrelated"]), [])
  })

  it("ignores broadcasts returned that were never asked about", () => {
    assert.deepEqual(getDeletedBroadcastIds(["asked"], ["asked", "extra"]), [])
  })
})
