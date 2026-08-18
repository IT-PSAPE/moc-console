import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { IntegrationNotConnectedError } from "../integration-access.js"
import { ProviderUpstreamError } from "../provider-failure.js"
import type { UsableConnections, YouTubeSyncConnection, ZoomSyncConnection } from "./provider-connections.js"
import { runStreamSync, type StreamSyncDependencies } from "./run-stream-sync.js"
import { emptyProviderSyncResult, type ProviderSyncResult } from "./sync-summary.js"

function youTubeConnection(workspaceId: string): YouTubeSyncConnection {
  return { channelId: `channel-${workspaceId}`, connectedBy: "connecting-user", workspaceId }
}

function zoomConnection(workspaceId: string): ZoomSyncConnection {
  return { connectedBy: "connecting-user", workspaceId, zoomConnectionId: `zoom-${workspaceId}` }
}

function usable<Connection>(connections: Connection[], overrides: Partial<UsableConnections<Connection>> = {}): UsableConnections<Connection> {
  return { connections, failures: [], skipped: [], ...overrides }
}

function syncedResult(overrides: Partial<ProviderSyncResult> = {}): ProviderSyncResult {
  return { ...emptyProviderSyncResult(), adopted: 1, announced: 1, ...overrides }
}

function createDependencies(overrides: Partial<StreamSyncDependencies>): StreamSyncDependencies {
  return {
    listYouTubeConnections: async () => usable([]),
    listZoomConnections: async () => usable([]),
    now: () => 0,
    syncYouTube: async () => syncedResult(),
    syncZoom: async () => syncedResult(),
    ...overrides,
  }
}

describe("runStreamSync", () => {
  it("keeps one provider's failure from stopping the other for the same workspace", async () => {
    const swept: string[] = []
    const summary = await runStreamSync(createDependencies({
      listYouTubeConnections: async () => usable([youTubeConnection("workspace-1")]),
      listZoomConnections: async () => usable([zoomConnection("workspace-1")]),
      syncYouTube: async () => { throw new ProviderUpstreamError("rate_limited") },
      syncZoom: async (connection) => {
        swept.push(connection.workspaceId)
        return syncedResult()
      },
    }))

    assert.deepEqual(swept, ["workspace-1"])
    assert.equal(summary.youtube.failed, 1)
    assert.equal(summary.zoom.synced, 1)
    assert.deepEqual(summary.failures, [{ provider: "youtube", reason: "rate_limited", workspaceId: "workspace-1" }])
  })

  it("keeps one workspace's failure from stopping the next", async () => {
    const swept: string[] = []
    const summary = await runStreamSync(createDependencies({
      listYouTubeConnections: async () => usable([youTubeConnection("workspace-1"), youTubeConnection("workspace-2")]),
      syncYouTube: async (connection) => {
        if (connection.workspaceId === "workspace-1") throw new Error("boom")
        swept.push(connection.workspaceId)
        return syncedResult({ adopted: 2, announced: 2 })
      },
    }))

    assert.deepEqual(swept, ["workspace-2"])
    assert.equal(summary.youtube.workspaces, 2)
    assert.equal(summary.youtube.synced, 1)
    assert.equal(summary.youtube.failed, 1)
    assert.equal(summary.youtube.adopted, 2)
  })

  it("counts a connection lost or needing reconnect as a skip, never a reported failure", async () => {
    const summary = await runStreamSync(createDependencies({
      listYouTubeConnections: async () => usable([youTubeConnection("workspace-1")], {
        skipped: [{ reason: "credentials_missing", workspaceId: "workspace-2" }],
      }),
      syncYouTube: async () => { throw new IntegrationNotConnectedError("youtube") },
    }))

    assert.equal(summary.youtube.workspaces, 2)
    assert.equal(summary.youtube.skipped, 2)
    assert.equal(summary.youtube.synced, 0)
    assert.equal(summary.youtube.failed, 0)
    assert.deepEqual(summary.failures, [])
  })

  it("reports a provider whose connection list could not be read without losing the other", async () => {
    const summary = await runStreamSync(createDependencies({
      listYouTubeConnections: async () => { throw new Error("connection list unavailable") },
      listZoomConnections: async () => usable([zoomConnection("workspace-1")]),
    }))

    assert.equal(summary.youtube.workspaces, 0)
    assert.equal(summary.zoom.synced, 1)
    assert.deepEqual(summary.failures, [{ provider: "youtube", reason: "enumeration_failed", workspaceId: null }])
  })

  it("fails the run only when neither provider's connection list can be read", async () => {
    await assert.rejects(runStreamSync(createDependencies({
      listYouTubeConnections: async () => { throw new Error("connection list unavailable") },
      listZoomConnections: async () => { throw new Error("connection list unavailable") },
    })), /connection list unavailable/)
  })

  it("stops a provider once the outage is the provider's, and defers the rest instead of repeating it", async () => {
    let attempts = 0
    const summary = await runStreamSync(createDependencies({
      listYouTubeConnections: async () => usable([
        youTubeConnection("workspace-1"),
        youTubeConnection("workspace-2"),
        youTubeConnection("workspace-3"),
      ]),
      syncYouTube: async () => {
        attempts += 1
        throw new ProviderUpstreamError("rate_limited")
      },
    }))

    // The quota is one bucket for the whole project, so workspaces 2 and 3 would
    // each spend a doomed request and report the same outage under their own id.
    assert.equal(attempts, 1)
    assert.equal(summary.youtube.failed, 1)
    assert.equal(summary.youtube.deferred, 2)
    assert.deepEqual(summary.failures, [{ provider: "youtube", reason: "rate_limited", workspaceId: "workspace-1" }])
  })

  it("caps YouTube so a long sweep cannot starve every Zoom workspace", async () => {
    let clock = 0
    const swept: string[] = []
    const summary = await runStreamSync(createDependencies({
      listYouTubeConnections: async () => usable([youTubeConnection("workspace-1"), youTubeConnection("workspace-2")]),
      listZoomConnections: async () => usable([zoomConnection("workspace-1")]),
      now: () => clock,
      syncYouTube: async (connection) => {
        clock += 30_000
        swept.push(`youtube:${connection.workspaceId}`)
        return syncedResult()
      },
      syncZoom: async (connection) => {
        swept.push(`zoom:${connection.workspaceId}`)
        return syncedResult()
      },
    }))

    assert.deepEqual(swept, ["youtube:workspace-1", "zoom:workspace-1"])
    assert.equal(summary.youtube.deferred, 1)
    assert.equal(summary.zoom.synced, 1)
  })

  it("defers whatever is left once the time budget is spent instead of being killed mid-sweep", async () => {
    let clock = 0
    const swept: string[] = []
    const summary = await runStreamSync(createDependencies({
      listYouTubeConnections: async () => usable([youTubeConnection("workspace-1"), youTubeConnection("workspace-2")]),
      now: () => {
        clock += 60_000
        return clock
      },
      syncYouTube: async (connection) => {
        swept.push(connection.workspaceId)
        return syncedResult()
      },
    }))

    assert.deepEqual(swept, [])
    assert.equal(summary.youtube.deferred, 2)
  })
})
