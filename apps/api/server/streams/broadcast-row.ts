import { type StreamStatus } from "./broadcast-reconciliation.js"

/**
 * Mirrors the response shape and row mapping in
 * apps/console/src/data/youtube-broadcast-sync.ts, which cannot be imported
 * here: it is a browser module built around session-authenticated fetches.
 */
export type YouTubeBroadcastSyncRow = {
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

export type StreamUpsertRow = {
  workspace_id: string
  youtube_broadcast_id: string
  youtube_stream_id: string
  title: string
  description: string
  thumbnail_url: string | null
  privacy_status: string
  is_for_kids: boolean
  scheduled_start_time: string | null
  actual_start_time: string | null
  actual_end_time: string | null
  stream_status: StreamStatus
  stream_url: string
  enable_dvr: boolean
  enable_embed: boolean
  enable_auto_start: boolean
  enable_auto_stop: boolean
  latency_preference: string
  created_by: string
}

function mapLifecycleStatus(status: string): StreamStatus {
  if (status === "complete") return "complete"
  if (status === "live" || status === "liveStarting") return "live"
  if (status === "ready" || status === "testing" || status === "testStarting") return "ready"
  return "created"
}

/**
 * `stream_key`, `ingestion_url`, `category_id`, `tags` and `playlist_id` are
 * deliberately absent: they are locally owned and would be wiped by the
 * conflict update if a reconcile wrote them back as empty.
 */
export function toStreamUpsertRow(broadcast: YouTubeBroadcastSyncRow, workspaceId: string, createdBy: string): StreamUpsertRow {
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
