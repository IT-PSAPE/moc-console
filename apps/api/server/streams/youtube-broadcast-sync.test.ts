import assert from "node:assert/strict"
import { describe, it } from "node:test"

import type { StreamUpsertRow, YouTubeBroadcastSyncRow } from "./broadcast-row.js"
import type { YouTubeSyncConnection } from "./provider-connections.js"
import { syncWorkspaceYouTubeBroadcasts } from "./youtube-broadcast-sync.js"
import type { AdoptedStreamRow, TrackedStreamRow, YouTubeSyncDependencies } from "./youtube-sync-store.js"

const connection: YouTubeSyncConnection = { channelId: "channel-1", connectedBy: "connecting-user", workspaceId: "workspace-1" }
const now = new Date("2026-08-05T12:00:00.000Z")

type Recorded = {
  announced: string[]
  deleted: string[][]
  upserted: StreamUpsertRow[]
}

function broadcast(id: string, lifeCycleStatus: string, scheduledStartTime: string | null): YouTubeBroadcastSyncRow {
  return {
    id,
    snippet: { title: `Broadcast ${id}`, scheduledStartTime },
    status: { privacyStatus: "unlisted", lifeCycleStatus },
  }
}

function createDependencies(
  overrides: Partial<YouTubeSyncDependencies>,
  recorded: Recorded = { announced: [], deleted: [], upserted: [] },
): { dependencies: YouTubeSyncDependencies; recorded: Recorded } {
  const dependencies: YouTubeSyncDependencies = {
    announceStream: async (_workspaceId, row) => {
      recorded.announced.push(row.youtube_broadcast_id)
    },
    deleteStreams: async (_workspaceId, broadcastIds) => {
      recorded.deleted.push(broadcastIds)
    },
    fetchAuthenticatedChannelId: async () => "channel-1",
    fetchBroadcastsByIds: async () => [],
    fetchCurrentBroadcasts: async () => [],
    now: () => now,
    readAdoptedStreams: async (_workspaceId, broadcastIds) => recorded.upserted
      .filter((row) => broadcastIds.includes(row.youtube_broadcast_id))
      .map((row): AdoptedStreamRow => ({
        id: `row-${row.youtube_broadcast_id}`,
        notified_at: null,
        scheduled_start_time: row.scheduled_start_time,
        stream_url: row.stream_url,
        title: row.title,
        youtube_broadcast_id: row.youtube_broadcast_id,
      })),
    readTrackedStreams: async () => [],
    upsertStreams: async (rows) => {
      recorded.upserted.push(...rows)
    },
    ...overrides,
  }
  return { dependencies, recorded }
}

function tracked(broadcastId: string, createdBy: string): TrackedStreamRow {
  return { youtube_broadcast_id: broadcastId, created_by: createdBy, stream_status: "live", actual_end_time: null }
}

describe("syncWorkspaceYouTubeBroadcasts", () => {
  it("adopts only current or upcoming broadcasts and always reconciles tracked ones", async () => {
    const { dependencies, recorded } = createDependencies({
      fetchCurrentBroadcasts: async () => [
        broadcast("upcoming", "ready", "2026-08-05T13:00:00.000Z"),
        broadcast("stale", "ready", "2026-03-01T10:00:00.000Z"),
        broadcast("known", "complete", "2026-08-01T10:00:00.000Z"),
      ],
      readTrackedStreams: async () => [tracked("known", "original-author")],
    })

    const result = await syncWorkspaceYouTubeBroadcasts(connection, dependencies)

    assert.deepEqual(result, { adopted: 1, announced: 1, announceFailed: 0, deleted: 0, reconciled: 1 })
    assert.deepEqual(recorded.upserted.map((row) => row.youtube_broadcast_id), ["upcoming", "known"])
    // A newly adopted row is credited to whoever authorised the integration; a
    // tracked row keeps the author it already had.
    assert.deepEqual(recorded.upserted.map((row) => row.created_by), ["connecting-user", "original-author"])
    // Only the adopted broadcast is announced, never the finished one.
    assert.deepEqual(recorded.announced, ["upcoming"])
  })

  it("upserts a broadcast once when it surfaces in more than one list", async () => {
    const { dependencies, recorded } = createDependencies({
      fetchCurrentBroadcasts: async () => [broadcast("live", "live", null)],
      fetchBroadcastsByIds: async () => [broadcast("live", "live", null)],
      readTrackedStreams: async () => [tracked("live", "original-author"), tracked("missing", "original-author")],
    })

    const result = await syncWorkspaceYouTubeBroadcasts(connection, dependencies)

    assert.deepEqual(recorded.upserted.map((row) => row.youtube_broadcast_id), ["live"])
    assert.equal(result.reconciled, 1)
  })

  it("refuses to delete unless the connection still answers for the recorded channel", async () => {
    for (const fetchAuthenticatedChannelId of [
      async () => "another-channel",
      async () => null,
      async () => { throw new Error("channel lookup failed") },
    ] satisfies YouTubeSyncDependencies["fetchAuthenticatedChannelId"][]) {
      const { dependencies, recorded } = createDependencies({
        fetchAuthenticatedChannelId,
        fetchBroadcastsByIds: async () => [],
        readTrackedStreams: async () => [tracked("missing", "original-author")],
      })

      const result = await syncWorkspaceYouTubeBroadcasts(connection, dependencies)

      assert.deepEqual(recorded.deleted, [])
      assert.equal(result.deleted, 0)
    }
  })

  it("deletes only the ids the lookup was asked about, once the channel is confirmed", async () => {
    const { dependencies, recorded } = createDependencies({
      fetchCurrentBroadcasts: async () => [broadcast("listed", "live", null)],
      fetchBroadcastsByIds: async () => [broadcast("answered", "complete", null)],
      readTrackedStreams: async () => [
        tracked("listed", "original-author"),
        tracked("answered", "original-author"),
        tracked("gone", "original-author"),
        { youtube_broadcast_id: "finished", created_by: "original-author", stream_status: "complete", actual_end_time: "2026-04-01T11:00:00.000Z" },
      ],
    })

    const result = await syncWorkspaceYouTubeBroadcasts(connection, dependencies)

    assert.deepEqual(recorded.deleted, [["gone"]])
    assert.equal(result.deleted, 1)
  })

  it("counts a failed announcement without abandoning the sweep's other work", async () => {
    const { dependencies, recorded } = createDependencies({
      announceStream: async () => { throw new Error("outbox unavailable") },
      fetchCurrentBroadcasts: async () => [broadcast("one", "live", null), broadcast("two", "live", null)],
    })

    const result = await syncWorkspaceYouTubeBroadcasts(connection, dependencies)

    assert.equal(result.adopted, 2)
    assert.equal(result.announced, 0)
    assert.equal(result.announceFailed, 2)
    assert.deepEqual(recorded.announced, [])
  })

  it("never announces an item that was already stamped as notified", async () => {
    const { dependencies, recorded } = createDependencies({
      fetchCurrentBroadcasts: async () => [broadcast("one", "live", null)],
      readAdoptedStreams: async () => [{
        id: "row-one",
        notified_at: "2026-08-01T00:00:00.000Z",
        scheduled_start_time: null,
        stream_url: null,
        title: "Broadcast one",
        youtube_broadcast_id: "one",
      }],
    })

    const result = await syncWorkspaceYouTubeBroadcasts(connection, dependencies)

    assert.equal(result.announced, 0)
    assert.deepEqual(recorded.announced, [])
  })
})
