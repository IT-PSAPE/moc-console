import { getSupabaseAdmin } from "./supabase-admin.js"

export type ProviderRecordsResource = "youtube-streams" | "zoom-meetings"

const STREAM_COLUMNS =
  "id, workspace_id, youtube_broadcast_id, youtube_stream_id, title, description, thumbnail_url, privacy_status, is_for_kids, scheduled_start_time, actual_start_time, actual_end_time, stream_status, stream_url, stream_key, ingestion_url, category_id, tags, latency_preference, enable_dvr, enable_embed, enable_auto_start, enable_auto_stop, playlist_id, created_by, created_at, updated_at"
const ZOOM_MEETING_COLUMNS =
  "id, workspace_id, zoom_meeting_id, topic, description, meeting_type, start_time, duration, timezone, join_url, password, recurrence_type, recurrence_interval, recurrence_days, waiting_room, mute_on_entry, continuous_chat, created_by, created_at, updated_at"

export function isProviderRecordsResource(value: string | null): value is ProviderRecordsResource {
  return value === "youtube-streams" || value === "zoom-meetings"
}

async function readZoomMeetings(workspaceId: string, id: string | null): Promise<unknown[]> {
  let query = getSupabaseAdmin()
    .from("zoom_meetings")
    .select(ZOOM_MEETING_COLUMNS)
    .eq("workspace_id", workspaceId)

  if (id) query = query.eq("id", id)

  const { data, error } = await query.order("start_time", { ascending: true, nullsFirst: false })
  if (error) throw new Error("Unable to read zoom-meetings")
  return data ?? []
}

async function readYouTubeStreams(workspaceId: string, id: string | null): Promise<unknown[]> {
  let query = getSupabaseAdmin()
    .from("streams")
    .select(STREAM_COLUMNS)
    .eq("workspace_id", workspaceId)

  if (id) query = query.eq("id", id)

  const { data, error } = await query.order("created_at", { ascending: false })
  if (error) throw new Error("Unable to read youtube-streams")
  return data ?? []
}

export async function readProviderRecords(
  resource: ProviderRecordsResource,
  workspaceId: string,
  id: string | null,
): Promise<unknown[]> {
  return resource === "zoom-meetings"
    ? readZoomMeetings(workspaceId, id)
    : readYouTubeStreams(workspaceId, id)
}
