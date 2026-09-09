import type { Stream } from "@moc/types/streams/stream"
import { supabase } from "@moc/data/supabase"
import { randomId } from "@moc/utils/random-id"

export type LocalStreamInsertPayload = {
  id?: string
  workspace_id: string
  youtube_broadcast_id: string
  youtube_stream_id: string
  title: string
  description: string
  thumbnail_url: string | null
  privacy_status: string
  is_for_kids: boolean
  scheduled_start_time: string | null
  actual_start_time?: string | null
  actual_end_time?: string | null
  stream_status: Stream["streamStatus"]
  stream_url: string | null
  stream_key?: string | null
  ingestion_url?: string | null
  category_id: string | null
  tags: string[]
  latency_preference: string
  enable_dvr: boolean
  enable_embed: boolean
  enable_auto_start: boolean
  enable_auto_stop: boolean
  playlist_id: string | null
  created_by: string
}

export async function insertLocalStream(payload: LocalStreamInsertPayload): Promise<void> {
  const { error } = await supabase.from("streams").insert(payload)
  if (error) throw new Error(error.message)
}

export function mapLocalStreamPayload(payload: LocalStreamInsertPayload): Stream {
  const timestamp = new Date().toISOString()
  return {
    id: payload.id ?? randomId(),
    workspaceId: payload.workspace_id,
    youtubeBroadcastId: payload.youtube_broadcast_id,
    youtubeStreamId: payload.youtube_stream_id,
    title: payload.title,
    description: payload.description,
    thumbnailUrl: payload.thumbnail_url,
    privacyStatus: payload.privacy_status as Stream["privacyStatus"],
    isForKids: payload.is_for_kids,
    scheduledStartTime: payload.scheduled_start_time,
    actualStartTime: payload.actual_start_time ?? null,
    actualEndTime: payload.actual_end_time ?? null,
    streamStatus: payload.stream_status,
    streamUrl: payload.stream_url,
    streamKey: payload.stream_key ?? null,
    ingestionUrl: payload.ingestion_url ?? null,
    categoryId: payload.category_id,
    tags: payload.tags,
    latencyPreference: payload.latency_preference as Stream["latencyPreference"],
    enableDvr: payload.enable_dvr,
    enableEmbed: payload.enable_embed,
    enableAutoStart: payload.enable_auto_start,
    enableAutoStop: payload.enable_auto_stop,
    playlistId: payload.playlist_id,
    createdBy: payload.created_by,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function getLocalStreamUpdate(stream: Stream, thumbnailUrl: string | null) {
  return {
    title: stream.title,
    description: stream.description,
    thumbnail_url: thumbnailUrl,
    privacy_status: stream.privacyStatus,
    is_for_kids: stream.isForKids,
    scheduled_start_time: stream.scheduledStartTime,
    category_id: stream.categoryId,
    tags: stream.tags,
    latency_preference: stream.latencyPreference,
    enable_dvr: stream.enableDvr,
    enable_embed: stream.enableEmbed,
    enable_auto_start: stream.enableAutoStart,
    enable_auto_stop: stream.enableAutoStop,
    playlist_id: stream.playlistId,
  }
}

export async function persistLocalStreamUpdate(streamId: string, values: ReturnType<typeof getLocalStreamUpdate>): Promise<void> {
  const { error } = await supabase.from("streams").update(values).eq("id", streamId)
  if (error) throw new Error(error.message)
}
