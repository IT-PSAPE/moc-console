import { announceStreamCreated } from "../notifications/created-announcement.js"
import { queryRows, withActor } from "@moc/backend/database"
import { proxyYouTubeApiRequest } from "../youtube-api.js"
import type { StreamReconciliationRow } from "./broadcast-reconciliation.js"
import type { StreamUpsertRow, YouTubeBroadcastSyncRow } from "./broadcast-row.js"

export type TrackedStreamRow = StreamReconciliationRow & { created_by: string }

export type AdoptedStreamRow = {
  id: string
  notified_at: string | null
  scheduled_start_time: string | null
  stream_url: string | null
  title: string
  youtube_broadcast_id: string
}

export type YouTubeSyncDependencies = {
  announceStream: (workspaceId: string, row: AdoptedStreamRow) => Promise<void>
  deleteStreams: (workspaceId: string, broadcastIds: string[]) => Promise<void>
  fetchAuthenticatedChannelId: (workspaceId: string) => Promise<string | null>
  fetchBroadcastsByIds: (workspaceId: string, broadcastIds: string[]) => Promise<YouTubeBroadcastSyncRow[]>
  fetchCurrentBroadcasts: (workspaceId: string) => Promise<YouTubeBroadcastSyncRow[]>
  now: () => Date
  readAdoptedStreams: (workspaceId: string, broadcastIds: string[]) => Promise<AdoptedStreamRow[]>
  readTrackedStreams: (workspaceId: string) => Promise<TrackedStreamRow[]>
  upsertStreams: (rows: StreamUpsertRow[]) => Promise<void>
}

const BROADCAST_PART = "snippet,status,contentDetails"

/** YouTube's documented ceiling on a comma-separated `id` filter. */
const ID_FILTER_LIMIT = 50

async function readBroadcasts(workspaceId: string, path: string): Promise<{ items?: YouTubeBroadcastSyncRow[]; nextPageToken?: string }> {
  const response = await proxyYouTubeApiRequest({ method: "GET", path, workspaceId })
  return await response.json() as { items?: YouTubeBroadcastSyncRow[]; nextPageToken?: string }
}

/**
 * The broadcasts the channel is running now or is about to run. These are the
 * only ones a sweep may adopt as new streams.
 */
async function fetchCurrentBroadcasts(workspaceId: string): Promise<YouTubeBroadcastSyncRow[]> {
  const broadcasts: YouTubeBroadcastSyncRow[] = []
  for (const broadcastStatus of ["upcoming", "active"] as const) {
    let pageToken: string | undefined
    do {
      const pageParam = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""
      const data = await readBroadcasts(
        workspaceId,
        `/liveBroadcasts?part=${BROADCAST_PART}&broadcastStatus=${broadcastStatus}&broadcastType=all&maxResults=50${pageParam}`,
      )
      broadcasts.push(...(data.items ?? []))
      pageToken = data.nextPageToken
    } while (pageToken)
  }
  return broadcasts
}

/**
 * Reads named broadcasts, to settle the final status of streams already
 * tracked. Paging the `completed` list would instead cost one request per fifty
 * broadcasts the channel has EVER run, almost all of them already recorded as
 * finished. A deleted broadcast is simply absent from a successful response.
 */
async function fetchBroadcastsByIds(workspaceId: string, broadcastIds: string[]): Promise<YouTubeBroadcastSyncRow[]> {
  const broadcasts: YouTubeBroadcastSyncRow[] = []
  for (let start = 0; start < broadcastIds.length; start += ID_FILTER_LIMIT) {
    const batch = broadcastIds.slice(start, start + ID_FILTER_LIMIT)
    // `broadcastType` and `maxResults` are only valid alongside a
    // `broadcastStatus` or `mine` filter, so an id lookup sends neither.
    const data = await readBroadcasts(workspaceId, `/liveBroadcasts?part=${BROADCAST_PART}&id=${batch.map(encodeURIComponent).join(",")}`)
    broadcasts.push(...(data.items ?? []))
  }
  return broadcasts
}

export const youTubeSyncStore: YouTubeSyncDependencies = {
  announceStream: async (workspaceId, row) => {
    await announceStreamCreated({
      workspaceId,
      streamId: row.id,
      title: row.title,
      scheduledStartTime: row.scheduled_start_time,
      streamUrl: row.stream_url,
    })
  },
  deleteStreams: async (workspaceId, broadcastIds) => {
    if (broadcastIds.length === 0) return
    await queryRows("DELETE FROM public.streams WHERE workspace_id=$1 AND youtube_broadcast_id=ANY($2::text[])", [workspaceId, broadcastIds])
  },
  fetchAuthenticatedChannelId: async (workspaceId) => {
    const response = await proxyYouTubeApiRequest({ method: "GET", path: "/channels?part=id&mine=true", workspaceId })
    const data = await response.json() as { items?: Array<{ id?: string }> }
    return data.items?.[0]?.id ?? null
  },
  fetchBroadcastsByIds,
  fetchCurrentBroadcasts,
  now: () => new Date(),
  readAdoptedStreams: async (workspaceId, broadcastIds) => {
    if (broadcastIds.length === 0) return []
    return queryRows<AdoptedStreamRow & import("pg").QueryResultRow>(
      "SELECT id,youtube_broadcast_id,title,scheduled_start_time,stream_url,notified_at FROM public.streams WHERE workspace_id=$1 AND youtube_broadcast_id=ANY($2::text[])",
      [workspaceId, broadcastIds],
    )
  },
  readTrackedStreams: async (workspaceId) => {
    return queryRows<TrackedStreamRow & import("pg").QueryResultRow>(
      "SELECT youtube_broadcast_id,created_by,stream_status,actual_end_time FROM public.streams WHERE workspace_id=$1", [workspaceId],
    )
  },
  upsertStreams: async (rows) => {
    if (rows.length === 0) return
    const columns = ["workspace_id", "youtube_broadcast_id", "youtube_stream_id", "title", "description", "thumbnail_url", "privacy_status", "is_for_kids", "scheduled_start_time", "actual_start_time", "actual_end_time", "stream_status", "stream_url", "enable_dvr", "enable_embed", "enable_auto_start", "enable_auto_stop", "latency_preference", "created_by"] as const
    await withActor({ userId: null, workspaceId: null, role: "moc_worker" }, async (client) => {
      for (const row of rows) {
        const values = [row.workspace_id, row.youtube_broadcast_id, row.youtube_stream_id, row.title, row.description, row.thumbnail_url,
          row.privacy_status, row.is_for_kids, row.scheduled_start_time, row.actual_start_time, row.actual_end_time, row.stream_status,
          row.stream_url, row.enable_dvr, row.enable_embed, row.enable_auto_start, row.enable_auto_stop, row.latency_preference, row.created_by]
        const placeholders = values.map((_, index) => `$${index + 1}`).join(",")
        await client.query(
          `INSERT INTO public.streams (${columns.join(",")}) VALUES (${placeholders})
           ON CONFLICT(workspace_id,youtube_broadcast_id) DO UPDATE SET youtube_stream_id=EXCLUDED.youtube_stream_id,
           title=EXCLUDED.title,description=EXCLUDED.description,thumbnail_url=EXCLUDED.thumbnail_url,privacy_status=EXCLUDED.privacy_status,
           is_for_kids=EXCLUDED.is_for_kids,scheduled_start_time=EXCLUDED.scheduled_start_time,actual_start_time=EXCLUDED.actual_start_time,
           actual_end_time=EXCLUDED.actual_end_time,stream_status=EXCLUDED.stream_status,stream_url=EXCLUDED.stream_url,
           enable_dvr=EXCLUDED.enable_dvr,enable_embed=EXCLUDED.enable_embed,enable_auto_start=EXCLUDED.enable_auto_start,
           enable_auto_stop=EXCLUDED.enable_auto_stop,latency_preference=EXCLUDED.latency_preference,updated_at=now()`,
          values,
        )
      }
    })
  },
}
