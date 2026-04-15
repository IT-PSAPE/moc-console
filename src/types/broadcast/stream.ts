export type StreamStatus = "created" | "ready" | "live" | "complete"
export type StreamPrivacy = "public" | "private" | "unlisted"
export type LatencyPreference = "normal" | "low" | "ultraLow"
export type ClosedCaptionsType = "closedCaptionsDisabled" | "closedCaptionsHttpPost" | "closedCaptionsEmbedded"

export type Stream = {
  id: string
  workspaceId: string
  youtubeBroadcastId: string
  youtubeStreamId: string
  title: string
  description: string
  thumbnailUrl: string | null
  privacyStatus: StreamPrivacy
  isForKids: boolean
  scheduledStartTime: string | null
  actualStartTime: string | null
  actualEndTime: string | null
  streamStatus: StreamStatus
  streamUrl: string | null
  streamKey: string | null
  ingestionUrl: string | null
  categoryId: string | null
  tags: string[]
  latencyPreference: LatencyPreference
  enableDvr: boolean
  enableEmbed: boolean
  enableAutoStart: boolean
  enableAutoStop: boolean
  playlistId: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type YouTubeConnection = {
  id: string
  workspaceId: string
  channelId: string
  channelTitle: string
  connectedBy: string
  createdAt: string
}

export type YouTubeCategory = {
  id: string
  title: string
}

export type YouTubePlaylist = {
  id: string
  title: string
  itemCount: number
}
