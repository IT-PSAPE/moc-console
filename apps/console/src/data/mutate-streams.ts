import type { Stream, StreamPreset, StreamPrivacy, LatencyPreference } from "@moc/types/streams/stream"
import type { NotifyDestination } from "@moc/types/streams"
import { supabase } from "@moc/data/supabase"
import { getCurrentWorkspaceId } from "./current-workspace"
import {
  youtubeApiFetch,
  revokeToken,
  uploadThumbnail,
  updateVideoMetadata,
  addVideoToPlaylist,
} from "@/lib/youtube-client"
import { fetchStreamById } from "./fetch-streams"
import { randomId } from "@moc/utils/random-id"
import { notifyStreamCreated } from "./notify-event"

// A thumbnail that has ALREADY been resolved to bytes in the modal. The data
// layer never fetches a thumbnail URL itself (that fetch is CORS-gated and was
// the source of the silent-failure bug) — it only POSTs these bytes to
// YouTube. `origin`/`sourceUrl` carry what the workspace preset should persist:
// Upload mode mirrors `blob` to Supabase (sourceUrl null); URL mode persists
// the already-validated `sourceUrl`.
export type ThumbnailSource =
  | { blob: Blob; origin: "file" | "url"; sourceUrl: string | null }
  | null

// Mirrors a resolved stream-thumbnail blob into the public `media` storage
// bucket, namespaced under <workspace_id>/stream-thumbnails/, so the workspace
// stream preset references a durable, CORS-safe Supabase URL for Upload-mode
// thumbnails instead of a YouTube CDN URL we can't re-fetch.
export async function uploadStreamThumbnail(blob: Blob): Promise<string> {
  const workspaceId = await getCurrentWorkspaceId()
  const ext = blob.type === "image/png" ? "png" : "jpg"
  const path = `${workspaceId}/stream-thumbnails/${randomId()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from("media")
    .upload(path, blob, {
      cacheControl: "3600",
      upsert: false,
      contentType: blob.type || "image/jpeg",
    })

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  const { data } = supabase.storage.from("media").getPublicUrl(path)
  return data.publicUrl
}

// createStream/updateStream are non-fatal w.r.t. the thumbnail: the stream is
// always created/updated. If YouTube itself rejects the thumbnail POST after
// the broadcast exists (almost always: channel not verified for custom
// thumbnails), `thumbnailError` carries a plain-language reason for the caller
// to surface — we do NOT roll back the broadcast (decision B2).
export type StreamMutationResult = {
  stream: Stream
  thumbnailError: string | null
}

// Maps a YouTube thumbnail-POST failure to non-technical, actionable copy.
function describeThumbnailFailure(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)
  if (/unauthoriz|forbidden|403|not.*verif|ineligible/i.test(raw)) {
    return "YouTube rejected the thumbnail — your channel may not be verified for custom thumbnails. The stream was created without it."
  }
  return "YouTube rejected the thumbnail, so the stream was created without it."
}

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
  // Optional per-stream override of the Telegram notification destination.
  notifyDestinations?: NotifyDestination[]
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

async function cleanupCreatedYouTubeResources(broadcastId: string | null, streamId: string | null): Promise<string | null> {
  const failures: string[] = []

  if (broadcastId) {
    try {
      const response = await youtubeApiFetch(`/liveBroadcasts?id=${encodeURIComponent(broadcastId)}`, { method: "DELETE" })
      if (!response.ok && response.status !== 404) failures.push("broadcast")
    } catch {
      failures.push("broadcast")
    }
  }

  if (streamId) {
    try {
      const response = await youtubeApiFetch(`/liveStreams?id=${encodeURIComponent(streamId)}`, { method: "DELETE" })
      if (!response.ok && response.status !== 404) failures.push("ingestion stream")
    } catch {
      failures.push("ingestion stream")
    }
  }

  return failures.length > 0 ? `Cleanup could not remove the ${failures.join(" and ")}.` : null
}

export async function createStream(params: CreateStreamParams): Promise<StreamMutationResult> {
  const workspaceId = await getCurrentWorkspaceId()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Not authenticated")
  }

  let broadcastId: string | null = null
  let streamId: string | null = null
  let localRecordSaved = false

  try {
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
    broadcastId = broadcast.id

    const streamResponse = await youtubeApiFetch(
      "/liveStreams?part=snippet,cdn",
      {
        method: "POST",
        body: JSON.stringify({
          snippet: { title: `${params.title} - Stream` },
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
    streamId = stream.id

    const bindResponse = await youtubeApiFetch(
      `/liveBroadcasts/bind?id=${broadcast.id}&part=id,contentDetails&streamId=${stream.id}`,
      { method: "POST" },
    )

    if (!bindResponse.ok) {
      const err = await bindResponse.text()
      throw new Error(`Failed to bind stream: ${err}`)
    }

    let thumbnailUrl: string | null = broadcast.snippet?.thumbnails?.default?.url ?? null
    let thumbnailError: string | null = null
    if (params.thumbnail) {
      try {
        await uploadThumbnail(broadcast.id, params.thumbnail.blob)
        const refreshed = await youtubeApiFetch(`/liveBroadcasts?part=snippet&id=${broadcast.id}`)
        if (refreshed.ok) {
          const refreshedData = await refreshed.json()
          thumbnailUrl = refreshedData.items?.[0]?.snippet?.thumbnails?.medium?.url ?? thumbnailUrl
        }
      } catch (error) {
        thumbnailError = describeThumbnailFailure(error)
      }
    }

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

    if (params.playlistId) {
      try {
        await addVideoToPlaylist(params.playlistId, broadcast.id)
      } catch {
        console.warn("Playlist assignment failed, continuing without playlist")
      }
    }

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

    await insertLocalStream(payload)
    localRecordSaved = true

    const saved = await fetchStreamById(payload.id)

    if (!saved) {
      throw new Error("Created stream could not be reloaded")
    }

    notifyStreamCreated(saved.id, params.notifyDestinations)

    return { stream: saved, thumbnailError }
  } catch (error) {
    if (localRecordSaved) throw error
    const cleanupError = await cleanupCreatedYouTubeResources(broadcastId, streamId).catch(() => "Cleanup could not be completed.")
    const message = error instanceof Error ? error.message : "The stream could not be created."
    throw new Error(cleanupError ? `${message} ${cleanupError}` : message)
  }
}

export async function updateStream(
  stream: Stream,
  thumbnail?: ThumbnailSource,
): Promise<StreamMutationResult> {
  const existingResponse = await youtubeApiFetch(
    `/liveBroadcasts?part=contentDetails&id=${stream.youtubeBroadcastId}`,
  )

  if (!existingResponse.ok) {
    throw new Error(`Failed to load broadcast before update: ${await existingResponse.text()}`)
  }

  const existingData = await existingResponse.json() as { items?: Array<{ contentDetails?: { boundStreamId?: string } }> }
  const boundStreamId = existingData.items?.[0]?.contentDetails?.boundStreamId
  if (!boundStreamId) {
    throw new Error("The broadcast is not bound to an ingestion stream and cannot be updated safely")
  }

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
          boundStreamId,
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

  // Update thumbnail if a new one was provided. Bytes were already resolved
  // and validated in the modal — no fetch here.
  let thumbnailUrl = stream.thumbnailUrl
  let thumbnailError: string | null = null
  if (thumbnail) {
    try {
      await uploadThumbnail(stream.youtubeBroadcastId, thumbnail.blob)
      const refreshed = await youtubeApiFetch(
        `/liveBroadcasts?part=snippet&id=${stream.youtubeBroadcastId}`,
      )
      if (refreshed.ok) {
        const refreshedData = await refreshed.json()
        thumbnailUrl =
          refreshedData.items?.[0]?.snippet?.thumbnails?.medium?.url ?? thumbnailUrl
      }
    } catch (error) {
      thumbnailError = describeThumbnailFailure(error)
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

  return { stream: saved, thumbnailError }
}

export async function deleteStream(stream: Stream): Promise<void> {
  // Delete the YouTube broadcast first. Only if it's gone on YouTube's
  // side do we delete our row — so a failed external delete never leaves
  // an orphaned broadcast we can no longer reach from the app. A 404
  // means it was already removed on YouTube, which is success here.
  const response = await youtubeApiFetch(
    `/liveBroadcasts?id=${stream.youtubeBroadcastId}`,
    { method: "DELETE" },
  )

  if (!response.ok && response.status !== 404) {
    const err = await response.text()
    throw new Error(`Failed to delete broadcast on YouTube; the stream was kept: ${err}`)
  }

  const { error } = await supabase
    .from("streams")
    .delete()
    .eq("id", stream.id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function deleteLocalStreamRecord(id: string): Promise<void> {
  const { error } = await supabase
    .from("streams")
    .delete()
    .eq("id", id)

  if (error) throw new Error(error.message)
}

export async function syncStreamsFromYouTube(): Promise<Stream[]> {
  const workspaceId = await getCurrentWorkspaceId()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Not authenticated")
  }

  // Import upcoming broadcasts only. Sync never removes local records: older
  // history stays local until an operator explicitly cleans it up.
  const broadcasts: YouTubeBroadcastSyncRow[] = []
  let pageToken: string | undefined
  do {
    const pageParam = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""
    const response = await youtubeApiFetch(
      `/liveBroadcasts?part=snippet,status,contentDetails&broadcastStatus=upcoming&broadcastType=all&maxResults=50${pageParam}`,
    )

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Failed to fetch broadcasts: ${err}`)
    }

    const data = await response.json() as { items?: YouTubeBroadcastSyncRow[]; nextPageToken?: string }
    broadcasts.push(...(data.items ?? []))
    pageToken = data.nextPageToken
  } while (pageToken)

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

  const payloads = broadcasts.map((broadcast) => {
    const contentDetails = broadcast.contentDetails ?? {}
    return {
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
  })

  if (payloads.length > 0) {
    const { error } = await supabase
      .from("streams")
      .upsert(payloads, { onConflict: "workspace_id,youtube_broadcast_id" })

    if (error) {
      throw new Error(error.message)
    }
  }

  // Fetch all streams from local DB to return fresh data
  const { data: rows, error } = await supabase
    .from("streams")
    .select(
      "id, workspace_id, youtube_broadcast_id, youtube_stream_id, title, description, thumbnail_url, privacy_status, is_for_kids, scheduled_start_time, actual_start_time, actual_end_time, stream_status, stream_url, stream_key, ingestion_url, category_id, tags, latency_preference, enable_dvr, enable_embed, enable_auto_start, enable_auto_stop, playlist_id, created_by, created_at, updated_at, notified_at",
    )
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

  // Provider tokens are held server-side; the browser only removes metadata
  // after the server has revoked the provider connection.
  const { data: connection } = await supabase
    .from("youtube_connections")
    .select("id")
    .eq("workspace_id", workspaceId)
    .single()

  if (connection) {
    // Revoke the token on Google's side
    await revokeToken(workspaceId)

    // Delete the connection record
    await supabase
      .from("youtube_connections")
      .delete()
      .eq("id", connection.id)
  }
}
