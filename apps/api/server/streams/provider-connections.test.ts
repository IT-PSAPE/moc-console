import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { IntegrationStoreError } from "../integration-oauth-store.js"
import {
  listUsableYouTubeConnections,
  listUsableZoomConnections,
  readActiveYouTubeConnections,
  readActiveZoomConnections,
  type ConnectionTableReader,
} from "./provider-connections.js"

describe("listUsableYouTubeConnections", () => {
  it("yields the channel and connecting user a sweep needs, without a second read", async () => {
    const usable = await listUsableYouTubeConnections({
      hasStoredCredentials: async () => true,
      readActiveConnections: async () => [{ workspace_id: "workspace-1", channel_id: "channel-1", connected_by: "user-1" }],
    })

    assert.deepEqual(usable.connections, [{ channelId: "channel-1", connectedBy: "user-1", workspaceId: "workspace-1" }])
    assert.deepEqual(usable.failures, [])
    assert.deepEqual(usable.skipped, [])
  })

  it("skips a connection whose stored credentials are gone before spending a provider request", async () => {
    let probes = 0
    const usable = await listUsableYouTubeConnections({
      hasStoredCredentials: async () => {
        probes += 1
        return false
      },
      readActiveConnections: async () => [{ workspace_id: "workspace-1", channel_id: "channel-1", connected_by: "user-1" }],
    })

    assert.equal(probes, 1)
    assert.deepEqual(usable.connections, [])
    assert.deepEqual(usable.skipped, [{ reason: "credentials_missing", workspaceId: "workspace-1" }])
    assert.deepEqual(usable.failures, [])
  })

  it("reports an unreadable credential store as a failure and still gates the next workspace", async () => {
    const usable = await listUsableYouTubeConnections({
      hasStoredCredentials: async (workspaceId) => {
        if (workspaceId === "workspace-1") throw new IntegrationStoreError()
        return true
      },
      readActiveConnections: async () => [
        { workspace_id: "workspace-1", channel_id: "channel-1", connected_by: "user-1" },
        { workspace_id: "workspace-2", channel_id: "channel-2", connected_by: "user-2" },
      ],
    })

    assert.deepEqual(usable.failures, [{ reason: "credentials_unavailable", workspaceId: "workspace-1" }])
    assert.deepEqual(usable.connections.map((connection) => connection.workspaceId), ["workspace-2"])
  })
})

describe("listUsableZoomConnections", () => {
  it("carries the connection row id the meeting foreign key requires", async () => {
    const usable = await listUsableZoomConnections({
      hasStoredCredentials: async () => true,
      readActiveConnections: async () => [{ workspace_id: "workspace-1", id: "zoom-connection-1", connected_by: "user-1" }],
    })

    assert.deepEqual(usable.connections, [{ connectedBy: "user-1", workspaceId: "workspace-1", zoomConnectionId: "zoom-connection-1" }])
  })
})

/**
 * Stands in for the admin client so the filter the readers apply is observable.
 * Rows are stored with every column, including the `status` a caller is meant to
 * filter on, so a reader that stopped filtering would return them all.
 */
function tableReader(rowsByTable: Record<string, Array<Record<string, string>>>): ConnectionTableReader {
  return (table) => ({
    select: () => ({
      eq: async (column, value) => ({
        data: (rowsByTable[table] ?? []).filter((row) => row[column] === value),
        error: null,
      }),
    }),
  })
}

describe("readActiveYouTubeConnections", () => {
  it("leaves a workspace that needs to reconnect out of the sweep entirely", async () => {
    const rows = await readActiveYouTubeConnections(tableReader({
      youtube_connections: [
        { workspace_id: "workspace-1", channel_id: "channel-1", connected_by: "user-1", status: "active" },
        { workspace_id: "workspace-2", channel_id: "channel-2", connected_by: "user-2", status: "reauth_required" },
      ],
    }))

    assert.deepEqual(rows.map((row) => row.workspace_id), ["workspace-1"])
  })

  it("surfaces a failed read instead of reporting an empty estate", async () => {
    await assert.rejects(readActiveYouTubeConnections(() => ({
      select: () => ({ eq: async () => ({ data: null, error: { message: "connection list unavailable" } }) }),
    })), /connection list unavailable/)
  })
})

describe("readActiveZoomConnections", () => {
  it("leaves a workspace that needs to reconnect out of the sweep entirely", async () => {
    const rows = await readActiveZoomConnections(tableReader({
      zoom_connections: [
        { workspace_id: "workspace-1", id: "zoom-connection-1", connected_by: "user-1", status: "active" },
        { workspace_id: "workspace-2", id: "zoom-connection-2", connected_by: "user-2", status: "reauth_required" },
      ],
    }))

    assert.deepEqual(rows.map((row) => row.workspace_id), ["workspace-1"])
  })
})
