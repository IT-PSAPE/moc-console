import type { QueryResultRow } from "pg"
import type { Stream, YouTubeConnection } from "@moc/types/streams/stream"
import type { ZoomConnection, ZoomMeeting } from "@moc/types/streams/zoom"
import type { PlatformContext, PlatformOperation } from "./context.js"
import { objectInput, uuidField } from "./input.js"

type Row = QueryResultRow & Record<string, unknown>

function recordInput(input: unknown, field: string, allowed: readonly string[]): Record<string, unknown> {
  const root = objectInput(input, [field])
  return objectInput(root[field], allowed)
}

function recordsInput(input: unknown, field: string, allowed: readonly string[]): Record<string, unknown>[] {
  const root = objectInput(input, [field])
  const records = root[field]
  if (!Array.isArray(records)) throw new Error(`Invalid ${field}`)
  return records.map((record) => objectInput(record, allowed))
}

function emptyInput(input: unknown): void {
  if (input === null) return
  objectInput(input, [])
}

function value<T>(record: Record<string, unknown>, key: string, fallback?: T): T {
  const field = record[key]
  return (field === undefined ? fallback : field) as T
}

const STREAM_FIELDS = [
  "id", "workspace_id", "youtube_broadcast_id", "youtube_stream_id", "title", "description", "thumbnail_url",
  "privacy_status", "is_for_kids", "scheduled_start_time", "actual_start_time", "actual_end_time", "stream_status",
  "stream_url", "stream_key", "ingestion_url", "category_id", "tags", "latency_preference", "enable_dvr",
  "enable_embed", "enable_auto_start", "enable_auto_stop", "playlist_id",
] as const
const MEETING_FIELDS = [
  "id", "workspace_id", "zoom_connection_id", "zoom_meeting_id", "topic", "description", "meeting_type", "start_time",
  "duration", "timezone", "join_url", "password", "recurrence_type", "recurrence_interval", "recurrence_days",
  "waiting_room", "mute_on_entry", "continuous_chat",
] as const
const STREAM_COLUMNS = "id, workspace_id, youtube_broadcast_id, youtube_stream_id, title, description, thumbnail_url, privacy_status, is_for_kids, scheduled_start_time, actual_start_time, actual_end_time, stream_status, stream_url, stream_key, ingestion_url, category_id, tags, latency_preference, enable_dvr, enable_embed, enable_auto_start, enable_auto_stop, playlist_id, created_by, created_at, updated_at"
const MEETING_COLUMNS = "id, workspace_id, zoom_meeting_id, topic, description, meeting_type, start_time, duration, timezone, join_url, password, recurrence_type, recurrence_interval, recurrence_days, waiting_room, mute_on_entry, continuous_chat, created_by, created_at, updated_at"
const YOUTUBE_CONNECTION_COLUMNS = "id, workspace_id, channel_id, channel_title, presets, connected_by, created_at, token_expires_at, status"
const ZOOM_CONNECTION_COLUMNS = "id, workspace_id, zoom_user_id, email, display_name, connected_by, created_at, status"

async function rows<T extends Row>(context: PlatformContext, query: string, params: readonly unknown[] = []): Promise<T[]> {
  const result = await context.db.query<T>(query, [...params])
  return result.rows
}

function toStream(row: Row): Stream {
  return {
    id: row.id as string, workspaceId: row.workspace_id as string, youtubeBroadcastId: row.youtube_broadcast_id as string,
    youtubeStreamId: row.youtube_stream_id as string, title: row.title as string, description: row.description as string,
    thumbnailUrl: row.thumbnail_url as string | null, privacyStatus: row.privacy_status as Stream["privacyStatus"],
    isForKids: row.is_for_kids as boolean, scheduledStartTime: row.scheduled_start_time as string | null,
    actualStartTime: row.actual_start_time as string | null, actualEndTime: row.actual_end_time as string | null,
    streamStatus: row.stream_status as Stream["streamStatus"], streamUrl: row.stream_url as string | null,
    streamKey: row.stream_key as string | null, ingestionUrl: row.ingestion_url as string | null,
    categoryId: row.category_id as string | null, tags: (row.tags as string[] | null) ?? [],
    latencyPreference: (row.latency_preference as Stream["latencyPreference"]) || "normal",
    enableDvr: row.enable_dvr as boolean, enableEmbed: row.enable_embed as boolean,
    enableAutoStart: row.enable_auto_start as boolean, enableAutoStop: row.enable_auto_stop as boolean,
    playlistId: row.playlist_id as string | null, createdBy: row.created_by as string,
    createdAt: row.created_at as string, updatedAt: row.updated_at as string,
  }
}

function toMeeting(row: Row): ZoomMeeting {
  return {
    id: row.id as string, workspaceId: row.workspace_id as string, zoomMeetingId: Number(row.zoom_meeting_id),
    topic: row.topic as string, description: row.description as string, meetingType: row.meeting_type as ZoomMeeting["meetingType"],
    startTime: row.start_time as string | null, duration: row.duration as number, timezone: row.timezone as string,
    joinUrl: row.join_url as string | null, password: row.password as string | null,
    recurrenceType: row.recurrence_type as ZoomMeeting["recurrenceType"], recurrenceInterval: row.recurrence_interval as number | null,
    recurrenceDays: row.recurrence_days as string | null, waitingRoom: row.waiting_room as boolean,
    muteOnEntry: row.mute_on_entry as boolean, continuousChat: row.continuous_chat as boolean,
    createdBy: row.created_by as string, createdAt: row.created_at as string, updatedAt: row.updated_at as string,
  }
}

function toYouTubeConnection(row: Row): YouTubeConnection {
  return {
    id: row.id as string, workspaceId: row.workspace_id as string, channelId: row.channel_id as string,
    channelTitle: row.channel_title as string, presets: row.presets as YouTubeConnection["presets"],
    connectedBy: row.connected_by as string, createdAt: row.created_at as string,
    tokenExpiresAt: row.token_expires_at as string, status: row.status as YouTubeConnection["status"],
  }
}

function toZoomConnection(row: Row): ZoomConnection {
  return {
    id: row.id as string, workspaceId: row.workspace_id as string, zoomUserId: row.zoom_user_id as string,
    email: row.email as string, displayName: row.display_name as string, connectedBy: row.connected_by as string,
    createdAt: row.created_at as string, status: row.status as ZoomConnection["status"],
  }
}

async function listStreams(context: PlatformContext): Promise<unknown[]> {
  return (await rows(context, `SELECT ${STREAM_COLUMNS} FROM public.streams WHERE workspace_id = $1 ORDER BY created_at DESC`, [context.workspaceId])).map(toStream)
}

async function listMeetings(context: PlatformContext): Promise<unknown[]> {
  return (await rows(context, `SELECT ${MEETING_COLUMNS} FROM public.zoom_meetings WHERE workspace_id = $1 ORDER BY start_time ASC NULLS LAST`, [context.workspaceId])).map(toMeeting)
}

async function getById(context: PlatformContext, table: "streams" | "zoom_meetings", columns: string, id: string): Promise<unknown | null> {
  const [row] = await rows(context, `SELECT ${columns} FROM public.${table} WHERE workspace_id = $1 AND id = $2 LIMIT 1`, [context.workspaceId, id])
  if (!row) return null
  return table === "streams" ? toStream(row) : toMeeting(row)
}

async function connection(context: PlatformContext, table: "youtube_connections" | "zoom_connections", columns: string): Promise<unknown | null> {
  const [row] = await rows(context, `SELECT ${columns} FROM public.${table} WHERE workspace_id = $1 LIMIT 1`, [context.workspaceId])
  if (!row) return null
  return table === "youtube_connections" ? toYouTubeConnection(row) : toZoomConnection(row)
}

async function deleteIds(context: PlatformContext, table: "streams" | "zoom_meetings", ids: string[], column: "id" | "youtube_broadcast_id"): Promise<null> {
  await context.db.query(`DELETE FROM public.${table} WHERE workspace_id = $1 AND ${column} = ANY($2::${column === "id" ? "uuid" : "text"}[])`, [context.workspaceId, ids])
  return null
}

async function insertStream(context: PlatformContext, record: Record<string, unknown>): Promise<null> {
  await context.db.query(
    `INSERT INTO public.streams (${STREAM_FIELDS.join(", ")}, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)`,
    [
      value(record, "id"), context.workspaceId, value(record, "youtube_broadcast_id"), value(record, "youtube_stream_id"),
      value(record, "title"), value(record, "description", ""), value(record, "thumbnail_url", null), value(record, "privacy_status"),
      value(record, "is_for_kids", false), value(record, "scheduled_start_time", null), value(record, "actual_start_time", null),
      value(record, "actual_end_time", null), value(record, "stream_status", "created"), value(record, "stream_url", null),
      value(record, "stream_key", null), value(record, "ingestion_url", null), value(record, "category_id", null),
      value(record, "tags", []), value(record, "latency_preference", "normal"), value(record, "enable_dvr", true),
      value(record, "enable_embed", true), value(record, "enable_auto_start", false), value(record, "enable_auto_stop", true),
      value(record, "playlist_id", null), context.userId,
    ],
  )
  return null
}

async function updateStream(context: PlatformContext, id: string, record: Record<string, unknown>): Promise<null> {
  await context.db.query(
    `UPDATE public.streams SET title=$3, description=$4, thumbnail_url=$5, privacy_status=$6, is_for_kids=$7,
      scheduled_start_time=$8, category_id=$9, tags=$10, latency_preference=$11, enable_dvr=$12, enable_embed=$13,
      enable_auto_start=$14, enable_auto_stop=$15, playlist_id=$16, updated_at=now()
     WHERE workspace_id=$1 AND id=$2`,
    [context.workspaceId, id, value(record, "title"), value(record, "description"), value(record, "thumbnail_url", null),
      value(record, "privacy_status"), value(record, "is_for_kids"), value(record, "scheduled_start_time", null),
      value(record, "category_id", null), value(record, "tags", []), value(record, "latency_preference"),
      value(record, "enable_dvr"), value(record, "enable_embed"), value(record, "enable_auto_start"),
      value(record, "enable_auto_stop"), value(record, "playlist_id", null)],
  )
  return null
}

async function upsertStreams(context: PlatformContext, records: Record<string, unknown>[]): Promise<null> {
  for (const record of records) {
    const params = [
      context.workspaceId, value(record, "youtube_broadcast_id"), value(record, "youtube_stream_id", ""), value(record, "title"),
      value(record, "description", ""), value(record, "thumbnail_url", null), value(record, "privacy_status"),
      value(record, "is_for_kids", false), value(record, "scheduled_start_time", null), value(record, "actual_start_time", null),
      value(record, "actual_end_time", null), value(record, "stream_status", "created"), value(record, "stream_url", null),
      value(record, "stream_key", null), value(record, "ingestion_url", null), value(record, "category_id", null),
      value(record, "tags", []), value(record, "latency_preference", "normal"), value(record, "enable_dvr", true),
      value(record, "enable_embed", true), value(record, "enable_auto_start", false), value(record, "enable_auto_stop", true),
      value(record, "playlist_id", null), context.userId,
    ]
    await context.db.query(
      `INSERT INTO public.streams (workspace_id,youtube_broadcast_id,youtube_stream_id,title,description,thumbnail_url,privacy_status,
        is_for_kids,scheduled_start_time,actual_start_time,actual_end_time,stream_status,stream_url,stream_key,ingestion_url,
        category_id,tags,latency_preference,enable_dvr,enable_embed,enable_auto_start,enable_auto_stop,playlist_id,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
       ON CONFLICT (workspace_id,youtube_broadcast_id) DO UPDATE SET youtube_stream_id=EXCLUDED.youtube_stream_id,
        title=EXCLUDED.title,description=EXCLUDED.description,thumbnail_url=EXCLUDED.thumbnail_url,privacy_status=EXCLUDED.privacy_status,
        is_for_kids=EXCLUDED.is_for_kids,scheduled_start_time=EXCLUDED.scheduled_start_time,actual_start_time=EXCLUDED.actual_start_time,
        actual_end_time=EXCLUDED.actual_end_time,stream_status=EXCLUDED.stream_status,stream_url=EXCLUDED.stream_url,
        stream_key=EXCLUDED.stream_key,ingestion_url=EXCLUDED.ingestion_url,category_id=EXCLUDED.category_id,tags=EXCLUDED.tags,
        latency_preference=EXCLUDED.latency_preference,enable_dvr=EXCLUDED.enable_dvr,enable_embed=EXCLUDED.enable_embed,
        enable_auto_start=EXCLUDED.enable_auto_start,enable_auto_stop=EXCLUDED.enable_auto_stop,playlist_id=EXCLUDED.playlist_id,
        updated_at=now()`,
      params,
    )
  }
  return null
}

async function insertMeeting(context: PlatformContext, record: Record<string, unknown>): Promise<null> {
  const [connectionRow] = await rows<Row>(context, "SELECT id FROM public.zoom_connections WHERE workspace_id=$1 LIMIT 1", [context.workspaceId])
  if (!connectionRow) throw new Error("Zoom is not connected for this workspace")
  await context.db.query(
    `INSERT INTO public.zoom_meetings (id,workspace_id,zoom_connection_id,zoom_meeting_id,topic,description,meeting_type,start_time,
      duration,timezone,join_url,password,recurrence_type,recurrence_interval,recurrence_days,waiting_room,mute_on_entry,continuous_chat,created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
    [value(record, "id"), context.workspaceId, connectionRow.id, value(record, "zoom_meeting_id"), value(record, "topic"),
      value(record, "description", ""), value(record, "meeting_type", "scheduled"), value(record, "start_time", null),
      value(record, "duration", 60), value(record, "timezone", "UTC"), value(record, "join_url", null), value(record, "password", null),
      value(record, "recurrence_type", "none"), value(record, "recurrence_interval", null), value(record, "recurrence_days", null),
      value(record, "waiting_room", false), value(record, "mute_on_entry", false), value(record, "continuous_chat", false), context.userId],
  )
  return null
}

async function updateMeeting(context: PlatformContext, id: string, record: Record<string, unknown>): Promise<null> {
  await context.db.query(
    `UPDATE public.zoom_meetings SET topic=$3,description=$4,start_time=$5,duration=$6,timezone=$7,recurrence_type=$8,
      recurrence_interval=$9,recurrence_days=$10,waiting_room=$11,mute_on_entry=$12,continuous_chat=$13,updated_at=now()
     WHERE workspace_id=$1 AND id=$2`,
    [context.workspaceId, id, value(record, "topic"), value(record, "description"), value(record, "start_time", null),
      value(record, "duration"), value(record, "timezone"), value(record, "recurrence_type"), value(record, "recurrence_interval", null),
      value(record, "recurrence_days", null), value(record, "waiting_room"), value(record, "mute_on_entry"), value(record, "continuous_chat")],
  )
  return null
}

async function upsertMeetings(context: PlatformContext, records: Record<string, unknown>[]): Promise<null> {
  const [connectionRow] = await rows<Row>(context, "SELECT id FROM public.zoom_connections WHERE workspace_id=$1 LIMIT 1", [context.workspaceId])
  if (!connectionRow) throw new Error("Zoom is not connected for this workspace")
  for (const record of records) {
    await context.db.query(
      `INSERT INTO public.zoom_meetings (workspace_id,zoom_connection_id,zoom_meeting_id,topic,description,meeting_type,start_time,duration,
        timezone,join_url,recurrence_type,recurrence_interval,recurrence_days,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (workspace_id,zoom_meeting_id) DO UPDATE SET zoom_connection_id=EXCLUDED.zoom_connection_id,topic=EXCLUDED.topic,
        description=EXCLUDED.description,meeting_type=EXCLUDED.meeting_type,start_time=EXCLUDED.start_time,duration=EXCLUDED.duration,
        timezone=EXCLUDED.timezone,join_url=EXCLUDED.join_url,recurrence_type=EXCLUDED.recurrence_type,
        recurrence_interval=EXCLUDED.recurrence_interval,recurrence_days=EXCLUDED.recurrence_days,updated_at=now()`,
      [context.workspaceId, connectionRow.id, value(record, "zoom_meeting_id"), value(record, "topic", "Untitled"),
        value(record, "description", ""), value(record, "meeting_type", "scheduled"), value(record, "start_time", null),
        value(record, "duration", 60), value(record, "timezone", "UTC"), value(record, "join_url", null),
        value(record, "recurrence_type", "none"), value(record, "recurrence_interval", null), value(record, "recurrence_days", null), context.userId],
    )
  }
  return null
}

const list: PlatformOperation = { permission: "can_read", run: async (context, input) => { emptyInput(input); return listStreams(context) } }
const get: PlatformOperation = { permission: "can_read", run: async (context, input) => getById(context, "streams", STREAM_COLUMNS, uuidField(objectInput(input, ["id"]), "id")) }
const listZoomMeetings: PlatformOperation = { permission: "can_read", run: async (context, input) => { emptyInput(input); return listMeetings(context) } }
const getZoomMeeting: PlatformOperation = { permission: "can_read", run: async (context, input) => getById(context, "zoom_meetings", MEETING_COLUMNS, uuidField(objectInput(input, ["id"]), "id")) }
const getYouTubeConnection: PlatformOperation = { permission: "can_read", run: async (context, input) => { emptyInput(input); return connection(context, "youtube_connections", YOUTUBE_CONNECTION_COLUMNS) } }
const getZoomConnection: PlatformOperation = { permission: "can_read", run: async (context, input) => { emptyInput(input); return connection(context, "zoom_connections", ZOOM_CONNECTION_COLUMNS) } }
const insertStreamOp: PlatformOperation = { permission: "can_create", run: async (context, input) => insertStream(context, recordInput(input, "record", STREAM_FIELDS)) }
const updateStreamOp: PlatformOperation = { permission: "can_update", run: async (context, input) => { const root = objectInput(input, ["id", "record"]); return updateStream(context, uuidField(root, "id"), objectInput(root.record, STREAM_FIELDS)) } }
const deleteStreamOp: PlatformOperation = { permission: "can_delete", run: async (context, input) => deleteIds(context, "streams", [uuidField(objectInput(input, ["id"]), "id")], "id") }
const upsertStreamsOp: PlatformOperation = { permission: "can_update", run: async (context, input) => upsertStreams(context, recordsInput(input, "records", STREAM_FIELDS)) }
const deleteByBroadcastsOp: PlatformOperation = { permission: "can_delete", run: async (context, input) => { const root = objectInput(input, ["ids"]); return deleteIds(context, "streams", stringArray(root.ids), "youtube_broadcast_id") } }
const updatePresetsOp: PlatformOperation = { permission: "can_update", run: async (context, input) => { const root = objectInput(input, ["presets"]); await context.db.query("UPDATE public.youtube_connections SET presets=$2 WHERE workspace_id=$1", [context.workspaceId, root.presets]); return null } }
const insertMeetingOp: PlatformOperation = { permission: "can_create", run: async (context, input) => insertMeeting(context, recordInput(input, "record", MEETING_FIELDS)) }
const updateMeetingOp: PlatformOperation = { permission: "can_update", run: async (context, input) => { const root = objectInput(input, ["id", "record"]); return updateMeeting(context, uuidField(root, "id"), objectInput(root.record, MEETING_FIELDS)) } }
const deleteMeetingOp: PlatformOperation = { permission: "can_delete", run: async (context, input) => deleteIds(context, "zoom_meetings", [uuidField(objectInput(input, ["id"]), "id")], "id") }
const upsertMeetingsOp: PlatformOperation = { permission: "can_update", run: async (context, input) => upsertMeetings(context, recordsInput(input, "records", MEETING_FIELDS)) }
const deleteMeetingsByIdsOp: PlatformOperation = { permission: "can_delete", run: async (context, input) => { const root = objectInput(input, ["ids"]); return deleteIds(context, "zoom_meetings", stringArray(root.ids), "id") } }

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) throw new Error("Invalid ids")
  return value as string[]
}

export const operations: Record<string, PlatformOperation> = {
  list, get, listZoomMeetings, getZoomMeeting, getYouTubeConnection, getZoomConnection,
  insertStream: insertStreamOp, updateStream: updateStreamOp, deleteStream: deleteStreamOp, upsertStreams: upsertStreamsOp,
  deleteStreamsByBroadcastIds: deleteByBroadcastsOp, updateYouTubePresets: updatePresetsOp,
  insertZoomMeeting: insertMeetingOp, updateZoomMeeting: updateMeetingOp, deleteZoomMeeting: deleteMeetingOp,
  upsertZoomMeetings: upsertMeetingsOp, deleteZoomMeetingsByIds: deleteMeetingsByIdsOp,
}
