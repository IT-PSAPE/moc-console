import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { IntegrationNotConnectedError } from "../integration-access.js"
import { IntegrationStoreError } from "../integration-oauth-store.js"
import { ProviderRequestTimeoutError } from "../provider-config.js"
import { ProviderUpstreamError } from "../provider-failure.js"
import type { ZoomMeetingSyncRow, ZoomMeetingUpsertRow } from "./meeting-row.js"
import type { ZoomSyncConnection } from "./provider-connections.js"
import { syncWorkspaceZoomMeetings } from "./zoom-meeting-sync.js"
import type { AdoptedMeetingRow, TrackedMeetingRow, ZoomSyncDependencies } from "./zoom-sync-store.js"

const connection: ZoomSyncConnection = { connectedBy: "connecting-user", workspaceId: "workspace-1", zoomConnectionId: "zoom-connection-1" }
const now = new Date("2026-08-05T12:00:00.000Z")

type Recorded = {
  announced: number[]
  deleted: string[][]
  upserted: ZoomMeetingUpsertRow[]
}

function meeting(id: number, startTime: string | null, overrides: Partial<ZoomMeetingSyncRow> = {}): ZoomMeetingSyncRow {
  return { id, topic: `Meeting ${id}`, start_time: startTime, duration: 60, timezone: "UTC", ...overrides }
}

function tracked(zoomMeetingId: number, createdBy: string): TrackedMeetingRow {
  return { id: `row-${zoomMeetingId}`, zoom_meeting_id: zoomMeetingId, recurrence_type: "none", start_time: "2026-08-05T13:00:00.000Z", created_by: createdBy }
}

function createDependencies(
  overrides: Partial<ZoomSyncDependencies>,
  recorded: Recorded = { announced: [], deleted: [], upserted: [] },
): { dependencies: ZoomSyncDependencies; recorded: Recorded } {
  const dependencies: ZoomSyncDependencies = {
    announceMeeting: async (_workspaceId, row) => {
      recorded.announced.push(row.zoom_meeting_id)
    },
    deleteMeetings: async (_workspaceId, meetingRowIds) => {
      recorded.deleted.push(meetingRowIds)
    },
    fetchUpcomingMeetings: async () => [],
    lookUpMeeting: async () => { throw new ProviderUpstreamError("failed") },
    now: () => now,
    readAdoptedMeetings: async (_workspaceId, zoomMeetingIds) => recorded.upserted
      .filter((row) => zoomMeetingIds.includes(row.zoom_meeting_id))
      .map((row): AdoptedMeetingRow => ({
        id: `row-${row.zoom_meeting_id}`,
        join_url: row.join_url,
        notified_at: null,
        start_time: row.start_time,
        topic: row.topic,
        zoom_meeting_id: row.zoom_meeting_id,
      })),
    readTrackedMeetings: async () => [],
    upsertMeetings: async (rows) => {
      recorded.upserted.push(...rows)
    },
    ...overrides,
  }
  return { dependencies, recorded }
}

describe("syncWorkspaceZoomMeetings", () => {
  it("stamps the connection and writes only the columns the console does not own", async () => {
    const { dependencies, recorded } = createDependencies({
      // Zoom returns a host-only start URL and the meeting password from its
      // list endpoints; neither may reach the database.
      fetchUpcomingMeetings: async () => [{
        ...meeting(1, "2026-08-05T13:00:00.000Z", { join_url: "https://zoom.us/j/1" }),
        start_url: "https://zoom.us/s/host-secret",
        password: "secret",
      } as ZoomMeetingSyncRow],
    })

    const result = await syncWorkspaceZoomMeetings(connection, dependencies)

    assert.equal(result.adopted, 1)
    assert.deepEqual(Object.keys(recorded.upserted[0]).sort(), [
      "created_by", "description", "duration", "join_url", "meeting_type",
      "start_time", "timezone", "topic", "workspace_id", "zoom_connection_id", "zoom_meeting_id",
    ])
    assert.equal(recorded.upserted[0].zoom_connection_id, "zoom-connection-1")
    assert.equal(recorded.upserted[0].created_by, "connecting-user")
  })

  it("keeps the existing author when reconciling and does not adopt a finished meeting", async () => {
    const { dependencies, recorded } = createDependencies({
      fetchUpcomingMeetings: async () => [
        meeting(1, "2026-08-05T13:00:00.000Z"),
        meeting(2, "2026-08-05T10:00:00.000Z"),
      ],
      readTrackedMeetings: async () => [tracked(1, "original-author")],
    })

    const result = await syncWorkspaceZoomMeetings(connection, dependencies)

    assert.deepEqual(result, { adopted: 0, announced: 0, announceFailed: 0, deleted: 0, reconciled: 1 })
    assert.deepEqual(recorded.upserted.map((row) => [row.zoom_meeting_id, row.created_by]), [[1, "original-author"]])
    assert.deepEqual(recorded.announced, [])
  })

  it("deletes a local row only when Zoom itself reports the meeting as gone", async () => {
    const { dependencies, recorded } = createDependencies({
      lookUpMeeting: async (_workspaceId, zoomMeetingId) => {
        if (zoomMeetingId === 1) throw new ProviderUpstreamError("not_found")
        throw new ProviderUpstreamError(zoomMeetingId === 2 ? "forbidden" : "failed")
      },
      readTrackedMeetings: async () => [tracked(1, "author"), tracked(2, "author"), tracked(3, "author")],
    })

    const result = await syncWorkspaceZoomMeetings(connection, dependencies)

    assert.deepEqual(recorded.deleted, [["row-1"]])
    assert.equal(result.deleted, 1)
    // An inconclusive answer changes nothing: those rows are neither deleted nor rewritten.
    assert.equal(result.reconciled, 0)
  })

  it("stops this workspace's Zoom sync instead of spending the invocation on doomed lookups", async () => {
    // A connection torn down or a credential store outage mid-sweep belongs here
    // too: the remaining lookups cannot succeed, and swallowing them left the
    // upsert to fail against the deleted connection under an unrelated reason.
    const failures = [
      new ProviderUpstreamError("unauthorized"),
      new ProviderUpstreamError("rate_limited"),
      new ProviderRequestTimeoutError(),
      new IntegrationNotConnectedError("zoom"),
      new IntegrationStoreError(),
    ]
    for (const failure of failures) {
      let lookups = 0
      const { dependencies, recorded } = createDependencies({
        lookUpMeeting: async () => {
          lookups += 1
          throw failure
        },
        readTrackedMeetings: async () => [tracked(1, "author"), tracked(2, "author")],
      })

      await assert.rejects(syncWorkspaceZoomMeetings(connection, dependencies), (error) => error === failure)
      assert.equal(lookups, 1)
      assert.deepEqual(recorded.deleted, [])
      assert.deepEqual(recorded.upserted, [])
    }
  })

  it("announces exactly the meetings it adopted", async () => {
    const { dependencies, recorded } = createDependencies({
      fetchUpcomingMeetings: async () => [meeting(1, "2026-08-05T13:00:00.000Z"), meeting(2, "2026-08-05T14:00:00.000Z")],
      readTrackedMeetings: async () => [tracked(2, "original-author")],
    })

    const result = await syncWorkspaceZoomMeetings(connection, dependencies)

    assert.equal(result.announced, 1)
    assert.deepEqual(recorded.announced, [1])
  })
})
