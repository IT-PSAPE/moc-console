import { getValidAccessToken } from "./youtube-auth"

const YOUTUBE_API = "https://www.googleapis.com/youtube/v3"

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
