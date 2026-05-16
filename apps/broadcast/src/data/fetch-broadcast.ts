import { supabase } from '@moc/data/supabase'
import type { Playlist, Cue, MediaItem } from '@moc/types/broadcast'

export type BroadcastWorkspace = {
  id: string
  name: string
  slug: string
}

type MediaRow = {
  id: string
  name: string
  type: MediaItem['type']
  url: string
  thumbnail_url: string | null
  created_at: string
}

type QueueRow = {
  id: string
  sort_order: number
  duration: number | null
  disabled: boolean
  media: MediaRow | MediaRow[] | null
}

type PlaylistRow = {
  id: string
  name: string
  description: string
  status: Playlist['status']
  created_at: string
  default_image_duration: number
  thumbnail_url: string | null
  playback_mode: Playlist['playbackMode']
  next_playlist_id: string | null
  transition: Playlist['transition']
  transition_duration_ms: number
  music: MediaRow | MediaRow[] | null
  queue: QueueRow[] | null
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function mapCueRow(row: QueueRow): Cue {
  const media = one(row.media)
  return {
    id: row.id,
    mediaItemId: media?.id ?? '',
    mediaItemName: media?.name ?? 'Unknown media',
    mediaItemType: media?.type ?? 'image',
    order: row.sort_order,
    durationOverride: row.duration,
    disabled: row.disabled,
  }
}

// Cue carries the type/name but the player also needs the media URL +
// thumbnail to render. Returned alongside the playlist as a lookup.
export type CueMedia = {
  url: string
  thumbnail: string | null
}

export type PlayablePlaylist = {
  playlist: Playlist
  mediaById: Record<string, CueMedia>
}

function mapPlaylistRow(row: PlaylistRow): PlayablePlaylist {
  const music = one(row.music)
  const mediaById: Record<string, CueMedia> = {}

  const cues = (row.queue ?? [])
    .filter((q) => !q.disabled)
    .map((q) => {
      const media = one(q.media)
      if (media) {
        mediaById[media.id] = { url: media.url, thumbnail: media.thumbnail_url }
      }
      return mapCueRow(q)
    })
    .sort((left, right) => left.order - right.order)

  const playlist: Playlist = {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    cues,
    backgroundMusicId: music?.id ?? null,
    backgroundMusicUrl: music?.url ?? null,
    backgroundMusicName: music?.name ?? null,
    defaultImageDuration: row.default_image_duration,
    videoSettings: { autoplay: true, loop: false, muted: false },
    thumbnailUrl: row.thumbnail_url,
    playbackMode: row.playback_mode,
    nextPlaylistId: row.next_playlist_id,
    transition: row.transition,
    transitionDurationMs: row.transition_duration_ms,
  }

  return { playlist, mediaById }
}

const PLAYLIST_SELECT = `
  id,
  name,
  description,
  status,
  created_at,
  default_image_duration,
  thumbnail_url,
  playback_mode,
  next_playlist_id,
  transition,
  transition_duration_ms,
  music:music_id(id, name, type, url, thumbnail_url, created_at),
  queue(
    id,
    sort_order,
    duration,
    disabled,
    media:media_id(id, name, type, url, thumbnail_url, created_at)
  )
`

// Lists every workspace via the anon-callable RPC (phase-22). This is
// the only workspace exposure — there is no anon RLS on the table.
export async function listWorkspaces(): Promise<BroadcastWorkspace[]> {
  const { data, error } = await supabase.rpc('list_signup_workspaces')
  if (error) throw new Error(error.message)
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
  }))
}

export async function fetchWorkspace(workspaceId: string): Promise<BroadcastWorkspace | undefined> {
  const workspaces = await listWorkspaces()
  return workspaces.find((w) => w.id === workspaceId)
}

// Published playlists for a workspace. Anon RLS (phase-29) already
// restricts reads to status = 'published'; the workspace filter scopes
// to the chosen workspace.
export async function fetchPublishedPlaylists(workspaceId: string): Promise<PlayablePlaylist[]> {
  const { data, error } = await supabase
    .from('playlists')
    .select(PLAYLIST_SELECT)
    .eq('workspace_id', workspaceId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return ((data ?? []) as PlaylistRow[]).map(mapPlaylistRow)
}

export async function fetchPlaylistForPlayback(playlistId: string): Promise<PlayablePlaylist | undefined> {
  const { data, error } = await supabase
    .from('playlists')
    .select(PLAYLIST_SELECT)
    .eq('id', playlistId)
    .eq('status', 'published')
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data ? mapPlaylistRow(data as PlaylistRow) : undefined
}
