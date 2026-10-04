import { queryRows } from "@moc/backend/database"
import { isUuid } from "./notifications/signed-ingest.js"

export type ProviderRecordsResource = "youtube-streams" | "zoom-meetings"
export type ProviderRecordsProvider = "youtube" | "zoom"

export const PROVIDER_RECORDS_PATH = "/moc-records"

export type ProviderRecordsResult = {
  body: { error: string } | { records: unknown[] }
  status: 200 | 400
}

export type ProviderRecordsReader = (
  resource: ProviderRecordsResource,
  workspaceId: string,
  id: string | null,
) => Promise<unknown[]>

const STREAM_COLUMNS =
  "id, workspace_id, youtube_broadcast_id, youtube_stream_id, title, description, thumbnail_url, privacy_status, is_for_kids, scheduled_start_time, actual_start_time, actual_end_time, stream_status, stream_url, stream_key, ingestion_url, category_id, tags, latency_preference, enable_dvr, enable_embed, enable_auto_start, enable_auto_stop, playlist_id, created_by, created_at, updated_at"
const ZOOM_MEETING_COLUMNS =
  "id, workspace_id, zoom_meeting_id::double precision AS zoom_meeting_id, topic, description, meeting_type, start_time, duration, timezone, join_url, password, recurrence_type, recurrence_interval, recurrence_days, waiting_room, mute_on_entry, continuous_chat, created_by, created_at, updated_at"

async function readZoomMeetings(workspaceId: string, id: string | null): Promise<unknown[]> {
  try {
    return await queryRows(
      `SELECT ${ZOOM_MEETING_COLUMNS} FROM public.zoom_meetings
       WHERE workspace_id=$1 AND ($2::uuid IS NULL OR id=$2::uuid) ORDER BY start_time ASC NULLS LAST`,
      [workspaceId, id],
    )
  } catch {
    throw new Error("Unable to read zoom-meetings")
  }
}

async function readYouTubeStreams(workspaceId: string, id: string | null): Promise<unknown[]> {
  try {
    return await queryRows(
      `SELECT ${STREAM_COLUMNS} FROM public.streams
       WHERE workspace_id=$1 AND ($2::uuid IS NULL OR id=$2::uuid) ORDER BY created_at DESC`,
      [workspaceId, id],
    )
  } catch {
    throw new Error("Unable to read youtube-streams")
  }
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

export async function resolveProviderRecordsResponse(
  provider: ProviderRecordsProvider,
  path: string,
  workspaceId: string,
  readRecords: ProviderRecordsReader = readProviderRecords,
): Promise<ProviderRecordsResult> {
  const id = new URL(path, "https://moc.invalid").searchParams.get("id")
  if (id && !isUuid(id)) return { status: 400, body: { error: "Invalid record ID" } }

  const resource: ProviderRecordsResource = provider === "zoom" ? "zoom-meetings" : "youtube-streams"
  const records = await readRecords(resource, workspaceId, id)
  return { status: 200, body: { records } }
}
