import type { Stream, StreamPreset, StreamPrivacy, LatencyPreference } from "@/types/broadcast/stream"
import { supabase } from "@/lib/supabase"
import { getCurrentWorkspaceId } from "./current-workspace"
import {
  youtubeApiFetch,
  revokeToken,
  uploadThumbnail,
  uploadThumbnailFromUrl,
  updateVideoMetadata,
  addVideoToPlaylist,
} from "@/lib/youtube-client"
import { fetchStreamById } from "./fetch-streams"
import { randomId } from "@/utils/random-id"
import { notifyStreamCreated } from "./notify-event"

export type ThumbnailSource =
  | { type: "file"; file: File }
  | { type: "url"; url: string }
  | null

type CreateStreamParams = {
  title: string
  description: string
  privacyStatus: StreamPrivacy
  isForKids: boolean
  scheduledStartTime: string | null
  categoryId: string | null
  tags: string[]
  latencyPreference: LatencyPreference
  enableDvr: boolean
  enableEmbed: boolean
  enableAutoStart: boolean
  enableAutoStop: boolean
  playlistId: string | null
  thumbnail: ThumbnailSource
}

type YouTubeBroadcastSyncRow = {
  id: string
  snippet: {
    title: string
    description?: string
    thumbnails?: {
      default?: {
        url?: string
      }
    }
    scheduledStartTime?: string | null
    actualStartTime?: string | null
    actualEndTime?: string | null
  }
  status: {
    privacyStatus: string
    madeForKids?: boolean
    lifeCycleStatus: string
  }
  contentDetails?: {
    boundStreamId?: string
    enableDvr?: boolean
    enableEmbed?: boolean
    enableAutoStart?: boolean
    enableAutoStop?: boolean
    latencyPreference?: string
  }
}

type LocalStreamInsertPayload = {
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

async function insertLocalStream(payload: LocalStreamInsertPayload): Promise<void> {
  const { error } = await supabase.from("streams").insert(payload)

  if (error) {
    throw new Error(error.message)
  }
}

async function restoreLocalStream(stream: Stream): Promise<void> {
  await insertLocalStream({
    id: stream.id,
    workspace_id: stream.workspaceId,
    youtube_broadcast_id: stream.youtubeBroadcastId,
    youtube_stream_id: stream.youtubeStreamId,
    title: stream.title,
    description: stream.description,
    thumbnail_url: stream.thumbnailUrl,
    privacy_status: stream.privacyStatus,
    is_for_kids: stream.isForKids,
    scheduled_start_time: stream.scheduledStartTime,
    actual_start_time: stream.actualStartTime,
    actual_end_time: stream.actualEndTime,
    stream_status: stream.streamStatus,
    stream_url: stream.streamUrl,
    stream_key: stream.streamKey,
    ingestion_url: stream.ingestionUrl,
    category_id: stream.categoryId,
    tags: stream.tags,
    latency_preference: stream.latencyPreference,
    enable_dvr: stream.enableDvr,
    enable_embed: stream.enableEmbed,
    enable_auto_start: stream.enableAutoStart,
    enable_auto_stop: stream.enableAutoStop,
    playlist_id: stream.playlistId,
    created_by: stream.createdBy,
  })
}

export async function createStream(params: CreateStreamParams): Promise<Stream> {
  const workspaceId = await getCurrentWorkspaceId()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Not authenticated")
  }

  // 1. Create the live broadcast on YouTube
  const broadcastResponse = await youtubeApiFetch(
    "/liveBroadcasts?part=snippet,status,contentDetails",
    {
      method: "POST",
      body: JSON.stringify({
        snippet: {
          title: params.title,
          description: params.description || "",
          scheduledStartTime: params.scheduledStartTime || new Date().toISOString(),
        },
        status: {
          privacyStatus: params.privacyStatus || "unlisted",
          selfDeclaredMadeForKids: params.isForKids || false,
        },
        contentDetails: {
          enableAutoStart: params.enableAutoStart,
          enableAutoStop: params.enableAutoStop,
          enableDvr: params.enableDvr,
          enableEmbed: params.enableEmbed,
          latencyPreference: params.latencyPreference,
        },
      }),
    },
  )

  if (!broadcastResponse.ok) {
    const err = await broadcastResponse.text()
    throw new Error(`Failed to create broadcast: ${err}`)
  }

  const broadcast = await broadcastResponse.json()

  // 2. Create the live stream (ingestion endpoint)
  const streamResponse = await youtubeApiFetch(
    "/liveStreams?part=snippet,cdn",
    {
      method: "POST",
      body: JSON.stringify({
        snippet: {
          title: `${params.title} - Stream`,
        },
        cdn: {
          frameRate: "variable",
          ingestionType: "rtmp",
          resolution: "variable",
        },
      }),
    },
  )

  if (!streamResponse.ok) {
    const err = await streamResponse.text()
    throw new Error(`Failed to create stream: ${err}`)
  }

  const stream = await streamResponse.json()

  // 3. Bind the stream to the broadcast
  const bindResponse = await youtubeApiFetch(
    `/liveBroadcasts/bind?id=${broadcast.id}&part=id,contentDetails&streamId=${stream.id}`,
    { method: "POST" },
  )

  if (!bindResponse.ok) {
    const err = await bindResponse.text()
    throw new Error(`Failed to bind stream: ${err}`)
  }

  // 4. Set thumbnail (if provided)
  let thumbnailUrl: string | null = broadcast.snippet?.thumbnails?.default?.url ?? null
  if (params.thumbnail) {
    try {
      if (params.thumbnail.type === "file") {
        await uploadThumbnail(broadcast.id, params.thumbnail.file)
      } else {
        await uploadThumbnailFromUrl(broadcast.id, params.thumbnail.url)
      }
      // Re-fetch to get the new thumbnail URL from YouTube
      const refreshed = await youtubeApiFetch(`/liveBroadcasts?part=snippet&id=${broadcast.id}`)
      if (refreshed.ok) {
        const refreshedData = await refreshed.json()
        thumbnailUrl = refreshedData.items?.[0]?.snippet?.thumbnails?.medium?.url ?? thumbnailUrl
      }
    } catch {
      // Thumbnail upload is non-critical — continue with stream creation
      console.warn("Thumbnail upload failed, continuing without custom thumbnail")
    }
  }

  // 5. Update video metadata (tags, category) if provided
  if (params.categoryId || params.tags.length > 0) {
    try {
      await updateVideoMetadata(broadcast.id, {
        categoryId: params.categoryId ?? undefined,
        tags: params.tags.length > 0 ? params.tags : undefined,
      })
    } catch {
      console.warn("Video metadata update failed, continuing without tags/category")
    }
  }

  // 6. Add to playlist if specified
  if (params.playlistId) {
    try {
      await addVideoToPlaylist(params.playlistId, broadcast.id)
    } catch {
      console.warn("Playlist assignment failed, continuing without playlist")
    }
  }

  // 7. Store in local database
  const payload = {
    id: randomId(),
    workspace_id: workspaceId,
    youtube_broadcast_id: broadcast.id,
    youtube_stream_id: stream.id,
    title: params.title,
    description: params.description,
    thumbnail_url: thumbnailUrl,
    privacy_status: params.privacyStatus,
    is_for_kids: params.isForKids,
    scheduled_start_time: params.scheduledStartTime,
    stream_status: "created" as const,
    stream_url: `https://www.youtube.com/watch?v=${broadcast.id}`,
    stream_key: stream.cdn?.ingestionInfo?.streamName ?? null,
    ingestion_url: stream.cdn?.ingestionInfo?.ingestionAddress ?? null,
    category_id: params.categoryId,
    tags: params.tags,
    latency_preference: params.latencyPreference,
    enable_dvr: params.enableDvr,
    enable_embed: params.enableEmbed,
    enable_auto_start: params.enableAutoStart,
    enable_auto_stop: params.enableAutoStop,
    playlist_id: params.playlistId,
    created_by: user.id,
  }

  try {
    await insertLocalStream(payload)
  } catch (error) {
    const rollbackResponse = await youtubeApiFetch(
      `/liveBroadcasts?id=${broadcast.id}`,
      { method: "DELETE" },
    )

    if (!rollbackResponse.ok) {
      const rollbackError = await rollbackResponse.text()
      throw new Error(`Local stream save failed after YouTube creation, and rollback also failed: ${rollbackError}`)
    }

    throw error
  }

  const saved = await fetchStreamById(payload.id)

  if (!saved) {
    throw new Error("Created stream could not be reloaded")
  }

  notifyStreamCreated(saved.id)

  return saved
}

export async function updateStream(
  stream: Stream,
  thumbnail?: ThumbnailSource,
): Promise<Stream> {
  // Update broadcast on YouTube (snippet, status, and contentDetails)
  const response = await youtubeApiFetch(
    "/liveBroadcasts?part=snippet,status,contentDetails",
    {
      method: "PUT",
      body: JSON.stringify({
        id: stream.youtubeBroadcastId,
        snippet: {
          title: stream.title,
          description: stream.description || "",
          scheduledStartTime: stream.scheduledStartTime || new Date().toISOString(),
        },
        status: {
          privacyStatus: stream.privacyStatus || "unlisted",
          selfDeclaredMadeForKids: stream.isForKids || false,
        },
        contentDetails: {
          enableAutoStart: stream.enableAutoStart,
          enableAutoStop: stream.enableAutoStop,
          enableDvr: stream.enableDvr,
          enableEmbed: stream.enableEmbed,
          latencyPreference: stream.latencyPreference,
        },
      }),
    },
  )

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Failed to update broadcast: ${err}`)
  }

  // Update thumbnail if a new one was provided
  let thumbnailUrl = stream.thumbnailUrl
  if (thumbnail) {
    try {
      if (thumbnail.type === "file") {
        await uploadThumbnail(stream.youtubeBroadcastId, thumbnail.file)
      } else {
        await uploadThumbnailFromUrl(stream.youtubeBroadcastId, thumbnail.url)
      }
      const refreshed = await youtubeApiFetch(
        `/liveBroadcasts?part=snippet&id=${stream.youtubeBroadcastId}`,
      )
      if (refreshed.ok) {
        const refreshedData = await refreshed.json()
        thumbnailUrl =
          refreshedData.items?.[0]?.snippet?.thumbnails?.medium?.url ?? thumbnailUrl
      }
    } catch {
      console.warn("Thumbnail update failed")
    }
  }

  // Update video metadata (tags, category)
  if (stream.categoryId || stream.tags.length > 0) {
    try {
      await updateVideoMetadata(stream.youtubeBroadcastId, {
        categoryId: stream.categoryId ?? undefined,
        tags: stream.tags.length > 0 ? stream.tags : undefined,
      })
    } catch {
      console.warn("Video metadata update failed")
    }
  }

  // Update local database
  const { error } = await supabase
    .from("streams")
    .update({
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
    })
    .eq("id", stream.id)

  if (error) {
    throw new Error(error.message)
  }

  const saved = await fetchStreamById(stream.id)

  if (!saved) {
    throw new Error("Updated stream could not be reloaded")
  }

  return saved
}

export async function deleteStream(stream: Stream): Promise<void> {
  const { error } = await supabase
    .from("streams")
    .delete()
    .eq("id", stream.id)

  if (error) {
    throw new Error(error.message)
  }

  const response = await youtubeApiFetch(
    `/liveBroadcasts?id=${stream.youtubeBroadcastId}`,
    { method: "DELETE" },
  )

  if (!response.ok) {
    try {
      await restoreLocalStream(stream)
    } catch (restoreError) {
      const err = await response.text()
      throw new Error(`Failed to delete broadcast and could not restore the local stream: ${err}; ${(restoreError as Error).message}`)
    }

    const err = await response.text()
    throw new Error(`Failed to delete broadcast: ${err}`)
  }
}

export async function syncStreamsFromYouTube(): Promise<Stream[]> {
  const workspaceId = await getCurrentWorkspaceId()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Not authenticated")
  }

  // Fetch only upcoming (scheduled) and active (live) broadcasts. Completed
  // broadcasts stay in our DB and are not re-fetched.
  const broadcasts: YouTubeBroadcastSyncRow[] = []
  for (const broadcastStatus of ["upcoming", "active"] as const) {
    let pageToken: string | undefined = undefined
    do {
      const pageParam = pageToken ? `&pageToken=${pageToken}` : ""
      const response = await youtubeApiFetch(
        `/liveBroadcasts?part=snippet,status,contentDetails&broadcastStatus=${broadcastStatus}&broadcastType=all&maxResults=50${pageParam}`,
      )

      if (!response.ok) {
        const err = await response.text()
        throw new Error(`Failed to fetch broadcasts: ${err}`)
      }

      const data = await response.json() as { items?: YouTubeBroadcastSyncRow[]; nextPageToken?: string }
      broadcasts.push(...(data.items ?? []))
      pageToken = data.nextPageToken
    } while (pageToken)
  }

  // Map YouTube lifecycle status to our stream_status enum
  function mapLifecycleStatus(status: string): Stream["streamStatus"] {
    switch (status) {
      case "complete":
        return "complete"
      case "live":
      case "liveStarting":
        return "live"
      case "ready":
      case "testing":
      case "testStarting":
        return "ready"
      default:
        return "created"
    }
  }

  // Upsert each broadcast into local DB
  for (const broadcast of broadcasts) {
    const contentDetails = broadcast.contentDetails ?? {}
    const payload = {
      workspace_id: workspaceId,
      youtube_broadcast_id: broadcast.id,
      youtube_stream_id: contentDetails.boundStreamId ?? "",
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
      enable_dvr: contentDetails.enableDvr ?? true,
      enable_embed: contentDetails.enableEmbed ?? true,
      enable_auto_start: contentDetails.enableAutoStart ?? false,
      enable_auto_stop: contentDetails.enableAutoStop ?? true,
      latency_preference: contentDetails.latencyPreference ?? "normal",
      created_by: user.id,
    }

    const { error } = await supabase
      .from("streams")
      .upsert(payload, { onConflict: "workspace_id,youtube_broadcast_id" })

    if (error) {
      throw new Error(error.message)
    }
  }

  // Remove local non-complete streams that are no longer present remotely
  // (cancelled before going live). Completed streams are preserved.
  const remoteIds = broadcasts.map((b) => b.id).filter(Boolean)
  let deleteQuery = supabase
    .from("streams")
    .delete()
    .eq("workspace_id", workspaceId)
    .neq("stream_status", "complete")
  if (remoteIds.length > 0) {
    const quoted = remoteIds.map((id) => `"${id}"`).join(",")
    deleteQuery = deleteQuery.not("youtube_broadcast_id", "in", `(${quoted})`)
  }
  const { error: deleteError } = await deleteQuery
  if (deleteError) {
    throw new Error(deleteError.message)
  }

  // Fetch all streams from local DB to return fresh data
  const { data: rows, error } = await supabase
    .from("streams")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  // Fire-and-forget notify for any rows that have never been notified.
  // The server atomically claims notified_at, so concurrent syncs are safe.
  for (const row of rows ?? []) {
    if (!row.notified_at) notifyStreamCreated(row.id)
  }

  return (rows ?? []).map((row) => ({
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
    streamStatus: row.stream_status as Stream["streamStatus"],
    streamUrl: row.stream_url,
    streamKey: row.stream_key,
    ingestionUrl: row.ingestion_url,
    categoryId: row.category_id ?? null,
    tags: row.tags ?? [],
    latencyPreference: (row.latency_preference as Stream["latencyPreference"]) || "normal",
    enableDvr: row.enable_dvr ?? true,
    enableEmbed: row.enable_embed ?? true,
    enableAutoStart: row.enable_auto_start ?? false,
    enableAutoStop: row.enable_auto_stop ?? true,
    playlistId: row.playlist_id ?? null,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

// Writes the workspace-level stream preset JSON onto youtube_connections.presets.
// One row per workspace, always overwritten (no preset history).
export async function saveStreamPreset(preset: StreamPreset): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId()
  const { error } = await supabase
    .from("youtube_connections")
    .update({ presets: preset })
    .eq("workspace_id", workspaceId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function disconnectYouTube(): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId()

  // Get the connection to revoke its token
  const { data: connection } = await supabase
    .from("youtube_connections")
    .select("id, access_token")
    .eq("workspace_id", workspaceId)
    .single()

  if (connection) {
    // Revoke the token on Google's side
    await revokeToken(connection.access_token)

    // Delete the connection record
    await supabase
      .from("youtube_connections")
      .delete()
      .eq("id", connection.id)
  }
}
