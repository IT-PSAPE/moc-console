import { buildSessionHeaders } from "./api-auth"
import { providerProxyPath } from "./provider-proxy-path"
import { providerRequestError } from "./provider-request-error"
import { getCurrentWorkspaceId } from "@/data/current-workspace"
import { apiUrl } from "@moc/utils/api-url"

export async function youtubeApiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const [sessionHeaders, workspaceId] = await Promise.all([buildSessionHeaders(), getCurrentWorkspaceId()])

  return fetch(apiUrl(`/api/youtube/v3${providerProxyPath(path)}`), {
    ...options,
    headers: {
      // Only declare a payload type when there is a payload: the proxy rejects a
      // body on read routes, and a bodyless JSON request is parsed server-side
      // into an empty object that reads as one.
      ...(options.body === undefined || options.body === null ? {} : { "Content-Type": "application/json" }),
      "X-MOC-Workspace": workspaceId,
      ...sessionHeaders,
      ...options.headers,
    },
  })
}

export async function uploadThumbnail(videoId: string, file: Blob): Promise<void> {
  const response = await youtubeApiFetch(`/thumbnails/set?videoId=${encodeURIComponent(videoId)}&uploadType=media`, {
    method: "POST",
    headers: {
      "Content-Type": file.type || "image/jpeg",
    },
    body: file,
  })

  if (!response.ok) {
    throw await providerRequestError(response, "Failed to upload thumbnail")
  }
}

export async function fetchVideoCategories(regionCode = "US") {
  const response = await youtubeApiFetch(
    `/videoCategories?part=snippet&regionCode=${regionCode}`,
  )

  if (!response.ok) {
    throw await providerRequestError(response, "Failed to fetch video categories")
  }

  const data = await response.json()
  return (data.items ?? [])
    .filter((item: { snippet: { assignable: boolean } }) => item.snippet.assignable)
    .map((item: { id: string; snippet: { title: string } }) => ({
      id: item.id,
      title: item.snippet.title,
    }))
}

export async function fetchChannelPlaylists() {
  const response = await youtubeApiFetch(
    "/playlists?part=snippet,contentDetails&mine=true&maxResults=50",
  )

  if (!response.ok) {
    throw await providerRequestError(response, "Failed to fetch playlists")
  }

  const data = await response.json()
  return (data.items ?? []).map(
    (item: { id: string; snippet: { title: string }; contentDetails: { itemCount: number } }) => ({
      id: item.id,
      title: item.snippet.title,
      itemCount: item.contentDetails.itemCount,
    }),
  )
}

export async function addVideoToPlaylist(playlistId: string, videoId: string): Promise<void> {
  const response = await youtubeApiFetch("/playlistItems?part=snippet", {
    method: "POST",
    body: JSON.stringify({
      snippet: {
        playlistId,
        resourceId: {
          kind: "youtube#video",
          videoId,
        },
      },
    }),
  })

  if (!response.ok) {
    throw await providerRequestError(response, "Failed to add video to playlist")
  }
}

export async function updateVideoMetadata(
  videoId: string,
  metadata: { categoryId?: string; tags?: string[] },
): Promise<void> {
  const getResponse = await youtubeApiFetch(
    `/videos?part=snippet&id=${videoId}`,
  )

  if (!getResponse.ok) {
    throw await providerRequestError(getResponse, "Failed to fetch video for metadata update")
  }

  const getData = await getResponse.json()
  const video = getData.items?.[0]
  if (!video) throw new Error("Video not found for metadata update")

  const snippet = { ...video.snippet }
  if (metadata.categoryId) snippet.categoryId = metadata.categoryId
  if (metadata.tags) snippet.tags = metadata.tags

  const response = await youtubeApiFetch("/videos?part=snippet", {
    method: "PUT",
    body: JSON.stringify({ id: videoId, snippet }),
  })

  if (!response.ok) {
    throw await providerRequestError(response, "Failed to update video metadata")
  }
}
