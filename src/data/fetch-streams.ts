import type { Stream, YouTubeConnection, YouTubeCategory, YouTubePlaylist } from "@/types/broadcast/stream"
import { supabase } from "@/lib/supabase"
import { getCurrentWorkspaceId } from "./current-workspace"
import { fetchVideoCategories, fetchChannelPlaylists } from "@/lib/youtube-client"

type StreamRow = {
  id: string
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
  stream_status: Stream["streamStatus"]
  stream_url: string | null
  stream_key: string | null
  ingestion_url: string | null
  category_id: string | null
  tags: string[] | null
  latency_preference: string
  enable_dvr: boolean
  enable_embed: boolean
  enable_auto_start: boolean
  enable_auto_stop: boolean
  playlist_id: string | null
  created_by: string
  created_at: string
  updated_at: string
}

type ConnectionRow = {
  id: string
  workspace_id: string
  channel_id: string
  channel_title: string
  connected_by: string
  created_at: string
}

function mapStreamRow(row: StreamRow): Stream {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    youtubeBroadcastId: row.youtube_broadcast_id,
    youtubeStreamId: row.youtube_stream_id,
    title: row.title,
    description: row.description,
    thumbnailUrl: row.thumbnail_url,
    privacyStatus: row.privacy_status as Stream["privacyStatus"],
    isForKids: row.is_for_kids,
    scheduledStartTime: row.scheduled_start_time,
    actualStartTime: row.actual_start_time,
    actualEndTime: row.actual_end_time,
    streamStatus: row.stream_status,
    streamUrl: row.stream_url,
    streamKey: row.stream_key,
    ingestionUrl: row.ingestion_url,
    categoryId: row.category_id,
    tags: row.tags ?? [],
    latencyPreference: (row.latency_preference as Stream["latencyPreference"]) || "normal",
    enableDvr: row.enable_dvr,
    enableEmbed: row.enable_embed,
    enableAutoStart: row.enable_auto_start,
    enableAutoStop: row.enable_auto_stop,
    playlistId: row.playlist_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapConnectionRow(row: ConnectionRow): YouTubeConnection {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    channelId: row.channel_id,
    channelTitle: row.channel_title,
    connectedBy: row.connected_by,
    createdAt: row.created_at,
  }
}

export async function fetchStreams(): Promise<Stream[]> {
  const workspaceId = await getCurrentWorkspaceId()
  const { data, error } = await supabase
    .from("streams")
    .select(
      "id, workspace_id, youtube_broadcast_id, youtube_stream_id, title, description, thumbnail_url, privacy_status, is_for_kids, scheduled_start_time, actual_start_time, actual_end_time, stream_status, stream_url, stream_key, ingestion_url, category_id, tags, latency_preference, enable_dvr, enable_embed, enable_auto_start, enable_auto_stop, playlist_id, created_by, created_at, updated_at",
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return ((data ?? []) as StreamRow[]).map(mapStreamRow)
}

export async function fetchStreamById(id: string): Promise<Stream | undefined> {
  const { data, error } = await supabase
    .from("streams")
    .select(
      "id, workspace_id, youtube_broadcast_id, youtube_stream_id, title, description, thumbnail_url, privacy_status, is_for_kids, scheduled_start_time, actual_start_time, actual_end_time, stream_status, stream_url, stream_key, ingestion_url, category_id, tags, latency_preference, enable_dvr, enable_embed, enable_auto_start, enable_auto_stop, playlist_id, created_by, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data ? mapStreamRow(data as StreamRow) : undefined
}

export async function fetchYouTubeConnection(): Promise<YouTubeConnection | null> {
  const workspaceId = await getCurrentWorkspaceId()
  const { data, error } = await supabase
    .from("youtube_connections")
    .select("id, workspace_id, channel_id, channel_title, connected_by, created_at")
    .eq("workspace_id", workspaceId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data ? mapConnectionRow(data as ConnectionRow) : null
}

export async function fetchCategories(regionCode = "US"): Promise<YouTubeCategory[]> {
  return fetchVideoCategories(regionCode)
}

export async function fetchPlaylists(): Promise<YouTubePlaylist[]> {
  return fetchChannelPlaylists()
}
