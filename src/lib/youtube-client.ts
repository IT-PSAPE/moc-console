import { supabase } from "./supabase"
import { getCurrentWorkspaceId } from "@/data/current-workspace"

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET
const TOKEN_URL = "https://oauth2.googleapis.com/token"
const YOUTUBE_API = "https://www.googleapis.com/youtube/v3"

type ConnectionTokens = {
  id: string
  access_token: string
  refresh_token: string
  token_expires_at: string
}

/** Fetch the workspace's YouTube connection including tokens. */
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

/** Returns a valid access token, refreshing if expired. */
async function getValidAccessToken(): Promise<string> {
  const connection = await getConnectionTokens()
  const expiresAt = new Date(connection.token_expires_at)
  const buffer = 60_000

  if (expiresAt.getTime() > Date.now() + buffer) {
    return connection.access_token
  }

  // Refresh the token
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token",
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Token refresh failed: ${err}`)
  }

  const tokens = await response.json()

  // Update the stored token
  await supabase
    .from("youtube_connections")
    .update({
      access_token: tokens.access_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    })
    .eq("id", connection.id)

  return tokens.access_token
}

/** Exchange an authorization code for tokens. */
export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Token exchange failed: ${err}`)
  }

  return response.json() as Promise<{
    access_token: string
    refresh_token: string
    expires_in: number
  }>
}

/** Fetch the authenticated user's YouTube channel info. */
export async function fetchChannelInfo(accessToken: string) {
  const response = await fetch(`${YOUTUBE_API}/channels?part=snippet&mine=true`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Failed to fetch channel info: ${err}`)
  }

  const data = await response.json()
  const channel = data.items?.[0]

  if (!channel) {
    throw new Error("No YouTube channel was found for this Google account. Create a YouTube channel first, then try again.")
  }

  return {
    channelId: channel.id as string,
    channelTitle: channel.snippet.title as string,
  }
}

/** Make an authenticated YouTube API call. Handles token refresh automatically. */
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

/** Upload a thumbnail image for a video/broadcast. Uses the upload endpoint (not the JSON API). */
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

/** Upload a thumbnail from a URL by fetching it first. */
export async function uploadThumbnailFromUrl(videoId: string, imageUrl: string): Promise<void> {
  const imageResponse = await fetch(imageUrl)
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch thumbnail image from URL`)
  }
  const blob = await imageResponse.blob()
  await uploadThumbnail(videoId, blob)
}

/** Fetch video categories for a given region. */
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

/** Fetch the authenticated user's playlists. */
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

/** Add a video (broadcast) to a playlist. */
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

/** Update video-level metadata (tags, category, etc). Requires sending all snippet fields. */
export async function updateVideoMetadata(
  videoId: string,
  metadata: { categoryId?: string; tags?: string[] },
): Promise<void> {
  // First fetch current video data so we don't overwrite existing fields
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

/** Revoke the OAuth token on Google's side. */
export async function revokeToken(accessToken: string): Promise<void> {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  })
}
