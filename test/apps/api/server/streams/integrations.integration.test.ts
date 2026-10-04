import { afterAll, beforeAll, describe, expect, test } from "vitest"
import { randomUUID } from "node:crypto"
import { Pool } from "pg"
import { getIntegrationTokens, saveIntegrationConnection, tryAcquireIntegrationRefreshLock, completeIntegrationTokenRefresh, markIntegrationReauthRequiredIfRefreshTokenMatches, deleteIntegrationConnection } from "../../../../../apps/api/server/integration-oauth-store"
import { readActiveYouTubeConnections, readActiveZoomConnections } from "../../../../../apps/api/server/streams/provider-connections"
import { youTubeSyncStore } from "../../../../../apps/api/server/streams/youtube-sync-store"
import { zoomSyncStore } from "../../../../../apps/api/server/streams/zoom-sync-store"
import { readProviderRecords } from "../../../../../apps/api/server/provider-records"

const databaseUrl = process.env.MOC_TEST_DATABASE_URL
const suite = databaseUrl ? describe : describe.skip
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null
const userId = randomUUID()
const workspaceId = randomUUID()
const email = `task8-${userId}@example.test`

suite("Task 8 OAuth and provider connection stores against PostgreSQL", () => {
  beforeAll(async () => {
    if (!pool) return
    process.env.DATABASE_URL = databaseUrl
    await pool.query('INSERT INTO moc_auth."user" (id,name,email) VALUES ($1,$2,$3)', [userId, "Task 8 Integration", email])
    await pool.query("INSERT INTO public.users (id,name,surname,email) VALUES ($1,'Task 8','Integration',$2)", [userId, email])
    await pool.query("INSERT INTO public.workspaces (id,name,slug) VALUES ($1,$2,$3)", [workspaceId, `Task 8 ${workspaceId}`, `task-8-${workspaceId}`])
  })

  afterAll(async () => {
    if (!pool) return
    try {
      await pool.query("DELETE FROM public.workspaces WHERE id=$1", [workspaceId])
      await pool.query('DELETE FROM moc_auth."user" WHERE id=$1', [userId])
    } finally {
      await pool.end()
    }
  })

  test("writes private tokens, reads active connections, and preserves refresh-lease compare-and-swap", async () => {
    if (!pool) throw new Error("MOC_TEST_DATABASE_URL is required")
    await saveIntegrationConnection(workspaceId, {
      provider: "youtube",
      connection: { channelId: "task8-channel", channelTitle: "Task 8 Channel", connectedBy: userId },
    }, { accessToken: "youtube-access", refreshToken: "youtube-refresh", tokenExpiresAt: "2030-01-01T00:00:00Z" })
    await saveIntegrationConnection(workspaceId, {
      provider: "zoom",
      connection: { zoomUserId: "task8-zoom-user", email, displayName: "Task 8 Zoom", connectedBy: userId },
    }, { accessToken: "zoom-access", refreshToken: "zoom-refresh", tokenExpiresAt: "2030-01-01T00:00:00Z" })

    expect(await getIntegrationTokens("youtube", workspaceId)).toEqual({
      accessToken: "youtube-access", refreshToken: "youtube-refresh", tokenExpiresAt: "2030-01-01T00:00:00.000Z",
    })
    expect((await readActiveYouTubeConnections()).map(({ workspace_id, channel_id, connected_by }) => ({ workspace_id, channel_id, connected_by })))
      .toContainEqual({ workspace_id: workspaceId, channel_id: "task8-channel", connected_by: userId })
    expect((await readActiveZoomConnections()).map(({ workspace_id, connected_by }) => ({ workspace_id, connected_by })))
      .toContainEqual({ workspace_id: workspaceId, connected_by: userId })
    const zoomConnection = await pool.query<{ id: string }>("SELECT id FROM public.zoom_connections WHERE workspace_id=$1", [workspaceId])
    expect((await readActiveZoomConnections()).map(({ id }) => id)).toContain(zoomConnection.rows[0].id)

    const youtubeRow = {
      workspace_id: workspaceId, youtube_broadcast_id: "task8-broadcast", youtube_stream_id: "task8-stream",
      title: "Task 8 stream", description: "", thumbnail_url: null, privacy_status: "unlisted", is_for_kids: false,
      scheduled_start_time: null, actual_start_time: null, actual_end_time: null, stream_status: "ready" as const,
      stream_url: "https://www.youtube.com/watch?v=task8-broadcast", enable_dvr: true, enable_embed: true,
      enable_auto_start: false, enable_auto_stop: true, latency_preference: "normal", created_by: userId,
    }
    await youTubeSyncStore.upsertStreams([youtubeRow])
    await pool.query("UPDATE public.streams SET stream_key='local-key', playlist_id='local-playlist' WHERE workspace_id=$1 AND youtube_broadcast_id=$2", [workspaceId, youtubeRow.youtube_broadcast_id])
    await youTubeSyncStore.upsertStreams([{ ...youtubeRow, title: "Task 8 updated stream" }])
    const syncedStream = await pool.query<{ title: string; stream_key: string; playlist_id: string }>(
      "SELECT title,stream_key,playlist_id FROM public.streams WHERE workspace_id=$1 AND youtube_broadcast_id=$2",
      [workspaceId, youtubeRow.youtube_broadcast_id],
    )
    expect(syncedStream.rows[0]).toEqual({ title: "Task 8 updated stream", stream_key: "local-key", playlist_id: "local-playlist" })
    expect(await youTubeSyncStore.readTrackedStreams(workspaceId)).toContainEqual(expect.objectContaining({ youtube_broadcast_id: "task8-broadcast", created_by: userId }))

    const zoomRow = await zoomSyncStore.readTrackedMeetings(workspaceId)
    expect(zoomRow).toEqual([])
    await zoomSyncStore.upsertMeetings([{
      workspace_id: workspaceId, zoom_connection_id: zoomConnection.rows[0].id, zoom_meeting_id: 81234567890,
      topic: "Task 8 meeting", description: "", meeting_type: "scheduled", start_time: null, duration: 60,
      timezone: "UTC", join_url: null, created_by: userId,
    }])
    expect(await zoomSyncStore.readTrackedMeetings(workspaceId)).toContainEqual(
      expect.objectContaining({ zoom_meeting_id: 81234567890, created_by: userId }),
    )
    const zoomRecords = await readProviderRecords("zoom-meetings", workspaceId, null) as Array<{ zoom_meeting_id: number }>
    expect(zoomRecords).toContainEqual(expect.objectContaining({ zoom_meeting_id: 81234567890 }))

    const leaseId = randomUUID()
    const expiresAt = "2030-01-02T00:00:00Z"
    expect(await tryAcquireIntegrationRefreshLock("youtube", workspaceId, "youtube-refresh", leaseId, expiresAt)).toBe(true)
    expect(await tryAcquireIntegrationRefreshLock("youtube", workspaceId, "youtube-refresh", randomUUID(), expiresAt)).toBe(false)
    expect(await completeIntegrationTokenRefresh("youtube", workspaceId, "youtube-refresh", leaseId, {
      accessToken: "youtube-access-2", refreshToken: "youtube-refresh-2", tokenExpiresAt: "2030-01-03T00:00:00Z",
    })).toBe(true)
    expect(await completeIntegrationTokenRefresh("youtube", workspaceId, "youtube-refresh", leaseId, {
      accessToken: "stale-access", refreshToken: "stale-refresh", tokenExpiresAt: "2030-01-04T00:00:00Z",
    })).toBe(false)

    expect(await markIntegrationReauthRequiredIfRefreshTokenMatches("youtube", workspaceId, "youtube-refresh-2")).toBe(true)
    expect(await readActiveYouTubeConnections()).not.toContainEqual(expect.objectContaining({ workspace_id: workspaceId }))
    await deleteIntegrationConnection("zoom", workspaceId)
    expect(await getIntegrationTokens("zoom", workspaceId)).toBeNull()
    expect((await readActiveZoomConnections()).map(({ workspace_id }) => workspace_id)).not.toContain(workspaceId)
  })
})
