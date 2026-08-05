import type { Stream, StreamPrivacy, LatencyPreference } from "@moc/types/streams/stream"
import type { NotifyDestination } from "@moc/types/streams"
import { supabase } from "@moc/data/supabase"
import { getCurrentWorkspaceId } from "./current-workspace"
import {
  youtubeApiFetch,
  uploadThumbnail,
  updateVideoMetadata,
  addVideoToPlaylist,
} from "@/lib/youtube-client"
import { fetchStreamById } from "./fetch-streams"
import { randomId } from "@moc/utils/random-id"
import { notifyStreamCreated } from "./notify-event"
import { providerRequestError } from "@/lib/provider-request-error"
import { describeThumbnailFailure, type ThumbnailSource } from "./stream-thumbnail"
import {
  getLocalStreamUpdate,
  insertLocalStream,
  mapLocalStreamPayload,
  persistLocalStreamUpdate,
} from "./stream-local"
import { syncStreamsFromYouTube as syncYouTubeStreams } from "./youtube-broadcast-sync"

export type { ThumbnailSource } from "./stream-thumbnail"
export { uploadStreamThumbnail } from "./stream-thumbnail"
export { syncStreamsFromYouTube } from "./youtube-broadcast-sync"
export { disconnectYouTube, saveStreamPreset } from "./youtube-connection-settings"

// createStream/updateStream are non-fatal w.r.t. the thumbnail: the stream is
// always created/updated. If YouTube itself rejects the thumbnail POST after
// the broadcast exists (almost always: channel not verified for custom
// thumbnails), `thumbnailError` carries a plain-language reason for the caller
// to surface — we do NOT roll back the broadcast (decision B2).
export type StreamMutationResult = {
  stream: Stream
  thumbnailError: string | null
  reconciliationWarning: string | null
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
      throw await providerRequestError(broadcastResponse, "Failed to create broadcast")
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
      throw await providerRequestError(streamResponse, "Failed to create stream")
    }

    const stream = await streamResponse.json()
    streamId = stream.id

    const bindResponse = await youtubeApiFetch(
      `/liveBroadcasts/bind?id=${broadcast.id}&part=id,contentDetails&streamId=${stream.id}`,
      { method: "POST" },
    )

    if (!bindResponse.ok) {
      throw await providerRequestError(bindResponse, "Failed to bind stream")
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

    try {
      await insertLocalStream(payload)
      localRecordSaved = true
    } catch (error) {
      // A network interruption can arrive after PostgREST has committed the
      // insert. Before rolling back YouTube, check whether that durable row is
      // already available under the client-generated ID.
      const persisted = await fetchStreamById(payload.id).catch(() => undefined)
      if (persisted) {
        await notifyStreamCreated(persisted.id, params.notifyDestinations)
        return { stream: persisted, thumbnailError, reconciliationWarning: null }
      }
      throw error
    }

    // The insert acknowledgement is the durable success boundary. A follow-up
    // read is useful for server defaults, but must not turn a successful create
    // into an apparent failure that prompts a duplicate retry.
    const saved = await fetchStreamById(payload.id).catch(() => undefined) ?? mapLocalStreamPayload(payload)

    await notifyStreamCreated(saved.id, params.notifyDestinations)

    return { stream: saved, thumbnailError, reconciliationWarning: null }
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
    throw await providerRequestError(existingResponse, "Failed to load broadcast before update")
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
    throw await providerRequestError(response, "Failed to update broadcast")
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
  const localValues = getLocalStreamUpdate(stream, thumbnailUrl)

  try {
    await persistLocalStreamUpdate(stream.id, localValues)
  } catch {
    // The provider update has already succeeded. Sync its canonical state and
    // retry the local write once so a transient database error does not leave
    // the user with a misleading failure or force them to repeat the update.
    try {
      await syncYouTubeStreams()
      await persistLocalStreamUpdate(stream.id, localValues)
    } catch {
      return {
        stream: { ...stream, thumbnailUrl },
        thumbnailError,
        reconciliationWarning: "YouTube was updated, but the local record could not be saved. Refresh streams later to reconcile the change.",
      }
    }
  }

  const saved = await fetchStreamById(stream.id).catch(() => undefined) ?? { ...stream, thumbnailUrl }

  return { stream: saved, thumbnailError, reconciliationWarning: null }
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
    throw await providerRequestError(response, "Failed to delete broadcast on YouTube; the stream was kept")
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
