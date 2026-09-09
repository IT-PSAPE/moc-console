import { announceStreamCreated } from "../notifications/created-announcement.js"
import { getSupabaseAdmin } from "../supabase-admin.js"
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
    const { error } = await getSupabaseAdmin()
      .from("streams")
      .delete()
      .eq("workspace_id", workspaceId)
      .in("youtube_broadcast_id", broadcastIds)
    if (error) throw new Error(error.message)
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
    const { data, error } = await getSupabaseAdmin()
      .from("streams")
      .select("id, youtube_broadcast_id, title, scheduled_start_time, stream_url, notified_at")
      .eq("workspace_id", workspaceId)
      .in("youtube_broadcast_id", broadcastIds)
    if (error) throw new Error(error.message)
    return (data ?? []) as AdoptedStreamRow[]
  },
  readTrackedStreams: async (workspaceId) => {
    const { data, error } = await getSupabaseAdmin()
      .from("streams")
      .select("youtube_broadcast_id, created_by, stream_status, actual_end_time")
      .eq("workspace_id", workspaceId)
    if (error) throw new Error(error.message)
    return (data ?? []) as TrackedStreamRow[]
  },
  upsertStreams: async (rows) => {
    const { error } = await getSupabaseAdmin()
      .from("streams")
      .upsert(rows, { onConflict: "workspace_id,youtube_broadcast_id" })
    if (error) throw new Error(error.message)
  },
}
