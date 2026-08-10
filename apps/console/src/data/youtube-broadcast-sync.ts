import type { Stream } from "@moc/types/streams/stream"
import { supabase } from "@moc/data/supabase"
import { getCurrentWorkspaceId } from "./current-workspace"
import { fetchAuthenticatedChannelId, youtubeApiFetch } from "@/lib/youtube-client"
import { providerRequestError } from "@/lib/provider-request-error"
import { notifyStreamCreated } from "./notify-event"
import { getDeletedBroadcastIds, getUnfinishedTrackedBroadcastIds, isCurrentOrUpcomingBroadcast, type StreamReconciliationRow } from "./youtube-broadcast-reconciliation"

type YouTubeBroadcastSyncRow = {
  id: string
  snippet: {
    title: string
    description?: string
    thumbnails?: { default?: { url?: string } }
    scheduledStartTime?: string | null
    actualStartTime?: string | null
    actualEndTime?: string | null
  }
  status: { privacyStatus: string; madeForKids?: boolean; lifeCycleStatus: string }
  contentDetails?: {
    boundStreamId?: string
    enableDvr?: boolean
    enableEmbed?: boolean
    enableAutoStart?: boolean
    enableAutoStop?: boolean
    latencyPreference?: string
  }
}

function mapLifecycleStatus(status: string): Stream["streamStatus"] {
  if (status === "complete") return "complete"
  if (status === "live" || status === "liveStarting") return "live"
  if (status === "ready" || status === "testing" || status === "testStarting") return "ready"
  return "created"
}

const BROADCAST_PART = "snippet,status,contentDetails"

/** YouTube's documented ceiling on a comma-separated `id` filter. */
const ID_FILTER_LIMIT = 50

/**
 * The broadcasts the channel is running now or is about to run. These are the
 * only ones a sync may adopt as new streams.
 */
async function fetchCurrentBroadcasts(): Promise<YouTubeBroadcastSyncRow[]> {
  const broadcasts: YouTubeBroadcastSyncRow[] = []
  const statuses = ["upcoming", "active"] as const
  for (const broadcastStatus of statuses) {
    let pageToken: string | undefined
    do {
      const pageParam = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""
      const response = await youtubeApiFetch(`/liveBroadcasts?part=${BROADCAST_PART}&broadcastStatus=${broadcastStatus}&broadcastType=all&maxResults=50${pageParam}`)
      if (!response.ok) throw await providerRequestError(response, "Failed to fetch broadcasts")
      const data = await response.json() as { items?: YouTubeBroadcastSyncRow[]; nextPageToken?: string }
      broadcasts.push(...(data.items ?? []))
      pageToken = data.nextPageToken
    } while (pageToken)
  }
  return broadcasts
}

/**
 * Reads named broadcasts, to settle the final status of streams we already
 * track. Paging the `completed` list did this before, at a cost of one request
 * per fifty broadcasts the channel has EVER run — a bill that grows forever and
 * is almost entirely spent re-reading streams that were already recorded as
 * finished. An id lookup asks only about the handful still in flight.
 *
 * A broadcast that has been deleted on YouTube is simply absent from the
 * response; the local row is left as it is.
 */
async function fetchBroadcastsByIds(broadcastIds: string[]): Promise<YouTubeBroadcastSyncRow[]> {
  const broadcasts: YouTubeBroadcastSyncRow[] = []
  for (let start = 0; start < broadcastIds.length; start += ID_FILTER_LIMIT) {
    const batch = broadcastIds.slice(start, start + ID_FILTER_LIMIT)
    // `broadcastType` and `maxResults` are only valid alongside a
    // `broadcastStatus` or `mine` filter, so an id lookup sends neither.
    const response = await youtubeApiFetch(`/liveBroadcasts?part=${BROADCAST_PART}&id=${batch.map(encodeURIComponent).join(",")}`)
    if (!response.ok) throw await providerRequestError(response, "Failed to fetch broadcasts")
    const data = await response.json() as { items?: YouTubeBroadcastSyncRow[] }
    broadcasts.push(...(data.items ?? []))
  }
  return broadcasts
}

/**
 * Whether the connection still authenticates as the channel the workspace
 * recorded when it connected.
 *
 * This gates deletion. A lookup by id cannot say *why* a broadcast is missing,
 * and a connection repointed at another Google account answers for a channel
 * that has never heard of any of these broadcasts — so every tracked stream
 * would look deleted at once. Anything short of a confirmed match leaves the
 * rows alone: a stale row is a nuisance, a wrongly deleted one is gone.
 */
async function isConnectedToRecordedChannel(workspaceId: string): Promise<boolean> {
  const [connectionResult, authenticatedChannelId] = await Promise.all([
    supabase.from("youtube_connections").select("channel_id").eq("workspace_id", workspaceId).maybeSingle(),
    fetchAuthenticatedChannelId(),
  ])
  if (connectionResult.error || !authenticatedChannelId) return false
  return connectionResult.data?.channel_id === authenticatedChannelId
}

function toUpsertRow(broadcast: YouTubeBroadcastSyncRow, workspaceId: string, createdBy: string) {
  const details = broadcast.contentDetails ?? {}
  return {
    workspace_id: workspaceId,
    youtube_broadcast_id: broadcast.id,
    youtube_stream_id: details.boundStreamId ?? "",
    title: broadcast.snippet.title,
    description: broadcast.snippet.description ?? "",
    thumbnail_url: broadcast.snippet.thumbnails?.default?.url ?? null,
    privacy_status: broadcast.status.privacyStatus,
    is_for_kids: broadcast.status.madeForKids ?? false,
    scheduled_start_time: broadcast.snippet.scheduledStartTime ?? null,
    actual_start_time: broadcast.snippet.actualStartTime ?? null,
    actual_end_time: broadcast.snippet.actualEndTime ?? null,
    stream_status: mapLifecycleStatus(broadcast.status.lifeCycleStatus),
    stream_url: `https://www.youtube.com/watch?v=${broadcast.id}`,
    enable_dvr: details.enableDvr ?? true,
    enable_embed: details.enableEmbed ?? true,
    enable_auto_start: details.enableAutoStart ?? false,
    enable_auto_stop: details.enableAutoStop ?? true,
    latency_preference: details.latencyPreference ?? "normal",
    created_by: createdBy,
  }
}

type StreamUpsertRow = ReturnType<typeof toUpsertRow>

export async function syncStreamsFromYouTube(): Promise<Stream[]> {
  const workspaceId = await getCurrentWorkspaceId()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const [currentBroadcasts, existingResult] = await Promise.all([
    fetchCurrentBroadcasts(),
    supabase.from("streams").select("youtube_broadcast_id, created_by, stream_status, actual_end_time").eq("workspace_id", workspaceId),
  ])
  if (existingResult.error) throw new Error(existingResult.error.message)
  const trackedStreams = (existingResult.data ?? []) as Array<StreamReconciliationRow & { created_by: string }>
  const existingCreators = new Map(trackedStreams.map((row) => [row.youtube_broadcast_id, row.created_by]))

  const unfinishedIds = getUnfinishedTrackedBroadcastIds(trackedStreams, currentBroadcasts.map((broadcast) => broadcast.id))
  const lookedUpBroadcasts = unfinishedIds.length > 0 ? await fetchBroadcastsByIds(unfinishedIds) : []
  const broadcasts = [...currentBroadcasts, ...lookedUpBroadcasts]
  const deletedIds = getDeletedBroadcastIds(unfinishedIds, lookedUpBroadcasts.map((broadcast) => broadcast.id))

  const now = new Date()
  // Keyed by broadcast id: one upsert may not touch the same row twice, and the
  // same broadcast can surface in more than one list.
  const payloads = new Map<string, StreamUpsertRow>()
  const adoptedBroadcastIds = new Set<string>()
  for (const broadcast of broadcasts) {
    const row = toUpsertRow(broadcast, workspaceId, existingCreators.get(broadcast.id) ?? user.id)
    // A stream we already track is always reconciled, so its status and end
    // time stay accurate once it goes live and finishes. One we do not track is
    // only taken on while it is current or upcoming.
    if (existingCreators.has(broadcast.id)) {
      payloads.set(broadcast.id, row)
    } else if (isCurrentOrUpcomingBroadcast(row, now)) {
      payloads.set(broadcast.id, row)
      adoptedBroadcastIds.add(broadcast.id)
    }
  }
  if (payloads.size > 0) {
    const { error } = await supabase.from("streams").upsert([...payloads.values()], { onConflict: "workspace_id,youtube_broadcast_id" })
    if (error) throw new Error(error.message)
  }
  // A stream that was still in flight and no longer exists on YouTube was
  // deleted there, so the local row goes with it. Streams already recorded as
  // finished are never looked up and so are never deleted: they stay as history.
  if (deletedIds.length > 0 && await isConnectedToRecordedChannel(workspaceId)) {
    const { error } = await supabase
      .from("streams")
      .delete()
      .eq("workspace_id", workspaceId)
      .in("youtube_broadcast_id", deletedIds)
    if (error) throw new Error(error.message)
  }

  const { data: rows, error } = await supabase
    .from("streams")
    .select("id, workspace_id, youtube_broadcast_id, youtube_stream_id, title, description, thumbnail_url, privacy_status, is_for_kids, scheduled_start_time, actual_start_time, actual_end_time, stream_status, stream_url, stream_key, ingestion_url, category_id, tags, latency_preference, enable_dvr, enable_embed, enable_auto_start, enable_auto_stop, playlist_id, created_by, created_at, updated_at, notified_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  // Only the streams this sync adopted are announced. Announcing every
  // un-notified row re-sent the entire backlog on each sync, and because the
  // per-user notification rate limit rejected most of that burst, `notified_at`
  // stayed null and the same streams queued up again on the next one.
  for (const row of rows ?? []) {
    if (!row.notified_at && adoptedBroadcastIds.has(row.youtube_broadcast_id)) void notifyStreamCreated(row.id)
  }
  return (rows ?? []).map((row) => ({
    id: row.id, workspaceId: row.workspace_id, youtubeBroadcastId: row.youtube_broadcast_id, youtubeStreamId: row.youtube_stream_id,
    title: row.title, description: row.description, thumbnailUrl: row.thumbnail_url, privacyStatus: row.privacy_status as Stream["privacyStatus"], isForKids: row.is_for_kids,
    scheduledStartTime: row.scheduled_start_time, actualStartTime: row.actual_start_time, actualEndTime: row.actual_end_time, streamStatus: row.stream_status as Stream["streamStatus"],
    streamUrl: row.stream_url, streamKey: row.stream_key, ingestionUrl: row.ingestion_url, categoryId: row.category_id ?? null, tags: row.tags ?? [],
    latencyPreference: (row.latency_preference as Stream["latencyPreference"]) || "normal", enableDvr: row.enable_dvr ?? true, enableEmbed: row.enable_embed ?? true,
    enableAutoStart: row.enable_auto_start ?? false, enableAutoStop: row.enable_auto_stop ?? true, playlistId: row.playlist_id ?? null,
    createdBy: row.created_by, createdAt: row.created_at, updatedAt: row.updated_at,
  }))
}
