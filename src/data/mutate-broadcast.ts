import type { Playlist } from "@/types/broadcast/broadcast"
import type { Cue } from "@/types/broadcast/cue"
import type { MediaItem } from "@/types/broadcast/media-item"

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 100))

// ─── Playlist Mutations ───────────────────────────────

export async function updatePlaylist(playlist: Playlist): Promise<Playlist> {
  await delay(100)
  return playlist
}

export async function deletePlaylist(_id: string): Promise<void> {
  await delay(100)
}

export async function updatePlaylistCues(_playlistId: string, cues: Cue[]): Promise<Cue[]> {
  await delay(100)
  return cues
}

// ─── Media Mutations ──────────────────────────────────

export async function createMediaItem(item: MediaItem): Promise<MediaItem> {
  await delay(100)
  return item
}

export async function deleteMediaItem(_id: string): Promise<void> {
  await delay(100)
}
