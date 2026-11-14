import type { ProviderRequestOptions } from "@moc/sdk/integrations"
import { providerProxyPath } from "./provider-proxy-path"
import { checkProviderApiResponse, providerRequestError } from "./provider-request-error"
import { moc } from "@/lib/moc-client"

export async function youtubeApiFetch(path: string, options: ProviderRequestOptions & { workspaceId: string }): Promise<Response> {
  if (!options.workspaceId) throw new Error("Select a workspace before contacting YouTube")
  const response = await moc.integrations.youtubeRequest(providerProxyPath(path), options)
  return checkProviderApiResponse(response)
}

/** Reads a blob as base64, without the `data:…;base64,` prefix. */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("The thumbnail image could not be read"))
    reader.onload = () => {
      const result = String(reader.result)
      const comma = result.indexOf(",")
      if (comma === -1) reject(new Error("The thumbnail image could not be read"))
      else resolve(result.slice(comma + 1))
    }
    reader.readAsDataURL(blob)
  })
}

/**
 * Sends the image inside a JSON envelope rather than as a raw binary body: the
 * proxy re-encodes it to bytes and forwards it to YouTube with the real image
 * content type. A raw body depends on the serverless runtime passing binary
 * through untouched, and a body it treats as text arrives corrupt — which
 * YouTube rejects as an invalid image.
 */
export async function uploadThumbnail(videoId: string, file: Blob, workspaceId: string): Promise<void> {
  const image = await blobToBase64(file)
  const response = await youtubeApiFetch(`/thumbnails/set?videoId=${encodeURIComponent(videoId)}&uploadType=media`, {
    workspaceId,
    method: "POST",
    body: JSON.stringify({ image, contentType: file.type || "image/jpeg" }),
  })

  if (!response.ok) {
    throw await providerRequestError(response, "Failed to upload thumbnail")
  }
}

/**
 * The channel the stored connection currently authenticates as, or null when
 * YouTube did not answer. Callers use it to check that the connection still
 * points at the channel the workspace recorded, so a connection repointed at
 * another Google account is not mistaken for the workspace's own channel.
 */
export async function fetchAuthenticatedChannelId(workspaceId: string): Promise<string | null> {
  const response = await youtubeApiFetch("/channels?part=id&mine=true", { workspaceId })
  if (!response.ok) return null

  const data = await response.json() as { items?: Array<{ id?: string }> }
  return data.items?.[0]?.id ?? null
}

export async function fetchVideoCategories(workspaceId: string, regionCode = "US") {
  const response = await youtubeApiFetch(
    `/videoCategories?part=snippet&regionCode=${encodeURIComponent(regionCode)}`,
    { workspaceId },
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

export async function fetchChannelPlaylists(workspaceId: string) {
  const response = await youtubeApiFetch(
    "/playlists?part=snippet,contentDetails&mine=true&maxResults=50",
    { workspaceId },
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

export async function addVideoToPlaylist(playlistId: string, videoId: string, workspaceId: string): Promise<void> {
  const response = await youtubeApiFetch("/playlistItems?part=snippet", {
    workspaceId,
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
  workspaceId: string,
): Promise<void> {
  const getResponse = await youtubeApiFetch(`/videos?part=snippet&id=${videoId}`, { workspaceId })

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
    workspaceId,
    method: "PUT",
    body: JSON.stringify({ id: videoId, snippet }),
  })

  if (!response.ok) {
    throw await providerRequestError(response, "Failed to update video metadata")
  }
}
