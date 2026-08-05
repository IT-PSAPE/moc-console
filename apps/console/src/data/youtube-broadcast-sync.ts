import type { Stream } from "@moc/types/streams/stream"
import { supabase } from "@moc/data/supabase"
import { getCurrentWorkspaceId } from "./current-workspace"
import { youtubeApiFetch } from "@/lib/youtube-client"
import { providerRequestError } from "@/lib/provider-request-error"
import { notifyStreamCreated } from "./notify-event"

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

async function fetchBroadcasts(): Promise<YouTubeBroadcastSyncRow[]> {
  const broadcasts: YouTubeBroadcastSyncRow[] = []
  const statuses = ["upcoming", "active", "completed"] as const
  for (const broadcastStatus of statuses) {
    let pageToken: string | undefined
    do {
      const pageParam = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""
      const response = await youtubeApiFetch(`/liveBroadcasts?part=snippet,status,contentDetails&broadcastStatus=${broadcastStatus}&broadcastType=all&maxResults=50${pageParam}`)
      if (!response.ok) throw await providerRequestError(response, "Failed to fetch broadcasts")
      const data = await response.json() as { items?: YouTubeBroadcastSyncRow[]; nextPageToken?: string }
      broadcasts.push(...(data.items ?? []))
      pageToken = data.nextPageToken
    } while (pageToken)
  }
  return broadcasts
}

export async function syncStreamsFromYouTube(): Promise<Stream[]> {
  const workspaceId = await getCurrentWorkspaceId()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const [broadcasts, existingResult] = await Promise.all([
    fetchBroadcasts(),
    supabase.from("streams").select("youtube_broadcast_id, created_by").eq("workspace_id", workspaceId),
  ])
  if (existingResult.error) throw new Error(existingResult.error.message)
  const existingCreators = new Map((existingResult.data ?? []).map((row) => [row.youtube_broadcast_id, row.created_by]))
  const payloads = broadcasts.map((broadcast) => {
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
      created_by: existingCreators.get(broadcast.id) ?? user.id,
    }
  })
  if (payloads.length > 0) {
    const { error } = await supabase.from("streams").upsert(payloads, { onConflict: "workspace_id,youtube_broadcast_id" })
    if (error) throw new Error(error.message)
  }

  const { data: rows, error } = await supabase
    .from("streams")
    .select("id, workspace_id, youtube_broadcast_id, youtube_stream_id, title, description, thumbnail_url, privacy_status, is_for_kids, scheduled_start_time, actual_start_time, actual_end_time, stream_status, stream_url, stream_key, ingestion_url, category_id, tags, latency_preference, enable_dvr, enable_embed, enable_auto_start, enable_auto_stop, playlist_id, created_by, created_at, updated_at, notified_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  for (const row of rows ?? []) if (!row.notified_at) void notifyStreamCreated(row.id)
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
