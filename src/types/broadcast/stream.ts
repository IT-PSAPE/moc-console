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

// Default settings remembered for the workspace, applied when creating a new stream.
// Thumbnails are stored as a URL (the YouTube-hosted thumbnailUrl of the stream that
// was used to save the preset). Raw File uploads can't be serialized into JSONB.
export type StreamPreset = {
  title: string
  description: string
  scheduledStartTime: string | null
  thumbnailUrl: string | null
  privacyStatus: StreamPrivacy
  isForKids: boolean
  categoryId: string | null
  tags: string[]
  latencyPreference: LatencyPreference
  enableDvr: boolean
  enableEmbed: boolean
  enableAutoStart: boolean
  enableAutoStop: boolean
  playlistId: string | null
}

export type YouTubeConnection = {
  id: string
  workspaceId: string
  channelId: string
  channelTitle: string
  connectedBy: string
  createdAt: string
  presets: StreamPreset | null
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
