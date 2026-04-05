import type { MediaItem } from "@/types/broadcast/media-item"
import type { Playlist } from "@/types/broadcast/broadcast"
import mockMedia from "./mock/media.json"
import mockPlaylists from "./mock/broadcasts.json"

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * ms))

// ─── Media ────────────────────────────────────────────

export async function fetchMedia(): Promise<MediaItem[]> {
  await delay(200)
  return mockMedia as MediaItem[]
}

export async function fetchMediaById(id: string): Promise<MediaItem | undefined> {
  await delay(100)
  return (mockMedia as MediaItem[]).find((m) => m.id === id)
}

// ─── Playlists ────────────────────────────────────────

export async function fetchPlaylists(): Promise<Playlist[]> {
  await delay(200)
  return mockPlaylists as Playlist[]
}

export async function fetchPlaylistById(id: string): Promise<Playlist | undefined> {
  await delay(100)
  return (mockPlaylists as Playlist[]).find((p) => p.id === id)
}
