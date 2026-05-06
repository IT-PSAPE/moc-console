import { supabase } from "./supabase"
import { buildSessionHeaders } from "./api-auth"
import { getCurrentWorkspaceId } from "@/data/current-workspace"

const YOUTUBE_API = "https://www.googleapis.com/youtube/v3"

type ConnectionTokens = {
  id: string
  access_token: string
  refresh_token: string
  token_expires_at: string
}

async function getJsonError(response: Response, fallback: string): Promise<string> {
  const contentType = response.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    const data = await response.json() as { error?: string }
    return data.error ?? fallback
  }
  return fallback
}

async function getConnectionTokens(): Promise<ConnectionTokens> {
  const workspaceId = await getCurrentWorkspaceId()
  const { data, error } = await supabase
    .from("youtube_connections")
    .select("id, access_token, refresh_token, token_expires_at")
    .eq("workspace_id", workspaceId)
    .single()

  if (error || !data) {
    throw new Error("YouTube is not connected for this workspace")
  }

  return data as ConnectionTokens
}

async function getValidAccessToken(): Promise<string> {
  const connection = await getConnectionTokens()
  const expiresAt = new Date(connection.token_expires_at)
  const buffer = 60_000

  if (expiresAt.getTime() > Date.now() + buffer) {
    return connection.access_token
  }

  const sessionHeaders = await buildSessionHeaders()
  const response = await fetch("/api/youtube/oauth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...sessionHeaders },
    body: JSON.stringify({ refreshToken: connection.refresh_token }),
  })

  if (!response.ok) {
    throw new Error(await getJsonError(response, "YouTube token refresh failed"))
  }

  const tokens = await response.json() as { access_token: string; expires_in: number }

  await supabase
    .from("youtube_connections")
    .update({
      access_token: tokens.access_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    })
    .eq("id", connection.id)

  return tokens.access_token
}

export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const sessionHeaders = await buildSessionHeaders()
  const response = await fetch("/api/youtube/oauth/exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...sessionHeaders },
    body: JSON.stringify({ code, redirectUri }),
  })

  if (!response.ok) {
    throw new Error(await getJsonError(response, "YouTube token exchange failed"))
  }

  return response.json() as Promise<{
    access_token: string
    refresh_token: string
    expires_in: number
    channel: { channelId: string; channelTitle: string }
  }>
}

export async function youtubeApiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const accessToken = await getValidAccessToken()
  const url = path.startsWith("http") ? path : `${YOUTUBE_API}${path}`

  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  })
}

export async function uploadThumbnail(videoId: string, file: Blob): Promise<void> {
  const accessToken = await getValidAccessToken()
  const url = `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}&uploadType=media`

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": file.type || "image/jpeg",
    },
    body: file,
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Failed to upload thumbnail: ${err}`)
  }
}

export async function uploadThumbnailFromUrl(videoId: string, imageUrl: string): Promise<void> {
  const imageResponse = await fetch(imageUrl)
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch thumbnail image from URL`)
  }
  const blob = await imageResponse.blob()
  await uploadThumbnail(videoId, blob)
}

export async function fetchVideoCategories(regionCode = "US") {
  const response = await youtubeApiFetch(
    `/videoCategories?part=snippet&regionCode=${regionCode}`,
  )

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Failed to fetch video categories: ${err}`)
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
    const err = await response.text()
    throw new Error(`Failed to fetch playlists: ${err}`)
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
    const err = await response.text()
    throw new Error(`Failed to add video to playlist: ${err}`)
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
    const err = await getResponse.text()
    throw new Error(`Failed to fetch video for metadata update: ${err}`)
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
    const err = await response.text()
    throw new Error(`Failed to update video metadata: ${err}`)
  }
}

export async function revokeToken(accessToken: string): Promise<void> {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(accessToken)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  })
}
