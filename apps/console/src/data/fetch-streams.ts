import type { Stream, YouTubeCategory, YouTubeConnection, YouTubePlaylist } from "@moc/types/streams/stream"
import { moc } from "@/lib/moc-client"
import { getCurrentWorkspaceId } from "./current-workspace"
import { fetchVideoCategories, fetchChannelPlaylists } from "@/lib/youtube-client"

export async function fetchStreams(workspaceId?: string): Promise<Stream[]> {
  return moc.streams.listStreams(workspaceId)
}

export async function fetchStreamById(id: string, workspaceId?: string): Promise<Stream | undefined> {
  return await moc.streams.getStream(id, workspaceId) ?? undefined
}

export async function fetchYouTubeConnection(workspaceId?: string): Promise<YouTubeConnection | null> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId()
  return moc.streams.getYouTubeConnection(resolvedWorkspaceId)
}

export async function fetchCategories(regionCode = "US"): Promise<YouTubeCategory[]> {
  return fetchVideoCategories(regionCode)
}

export async function fetchPlaylists(): Promise<YouTubePlaylist[]> {
  return fetchChannelPlaylists()
}
