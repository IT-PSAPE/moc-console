import type { MediaItem } from "@/types/broadcast/media-item";
import type { Playlist } from "@/types/broadcast/broadcast";
import type { Cue } from "@/types/broadcast/cue";
import { supabase } from "@/lib/supabase";
import { getCurrentWorkspaceId } from "./current-workspace";

type MediaRow = {
  id: string;
  name: string;
  type: MediaItem["type"];
  url: string;
  thumbnail_url: string | null;
  created_at: string;
};

type QueueRow = {
  id: string;
  sort_order: number;
  duration: number | null;
  disabled: boolean;
  media: MediaRow | MediaRow[] | null;
};

type PlaylistRow = {
  id: string;
  name: string;
  description: string;
  status: Playlist["status"];
  created_at: string;
  default_image_duration: number;
  music: MediaRow | MediaRow[] | null;
  queue: QueueRow[] | null;
};

function mapMediaRow(row: MediaRow): MediaItem {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    url: row.url,
    thumbnail: row.thumbnail_url,
    duration: null,
    createdAt: row.created_at,
  };
}

function mapCueRow(row: QueueRow): Cue {
  const media = Array.isArray(row.media) ? row.media[0] : row.media;

  return {
    id: row.id,
    mediaItemId: media?.id ?? "",
    mediaItemName: media?.name ?? "Unknown media",
    mediaItemType: media?.type ?? "image",
    order: row.sort_order,
    durationOverride: row.duration,
    disabled: row.disabled,
  };
}

function mapPlaylistRow(row: PlaylistRow): Playlist {
  const music = Array.isArray(row.music) ? row.music[0] : row.music;
  const cues = (row.queue ?? [])
    .map(mapCueRow)
    .sort((left, right) => left.order - right.order);

  return {
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
    videoSettings: {
      autoplay: true,
      loop: false,
      muted: false,
    },
  };
}

function selectPlaylists(workspaceId: string) {
  return supabase
    .from("playlists")
    .select(`
      id,
      name,
      description,
      status,
      created_at,
      default_image_duration,
      music:music_id(id, name, type, url, thumbnail_url, created_at),
      queue(
        id,
        sort_order,
        duration,
        disabled,
        media:media_id(id, name, type, url, thumbnail_url, created_at)
      )
    `)
    .eq("workspace_id", workspaceId);
}

export async function fetchMedia(): Promise<MediaItem[]> {
  const workspaceId = await getCurrentWorkspaceId();
  const { data, error } = await supabase
    .from("media")
    .select("id, name, type, url, thumbnail_url, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as MediaRow[]).map(mapMediaRow);
}

export async function fetchMediaById(id: string): Promise<MediaItem | undefined> {
  const { data, error } = await supabase
    .from("media")
    .select("id, name, type, url, thumbnail_url, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapMediaRow(data as MediaRow) : undefined;
}

export async function fetchPlaylists(): Promise<Playlist[]> {
  const workspaceId = await getCurrentWorkspaceId();
  const { data, error } = await selectPlaylists(workspaceId).order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as PlaylistRow[]).map(mapPlaylistRow);
}

export async function fetchPlaylistById(id: string): Promise<Playlist | undefined> {
  const workspaceId = await getCurrentWorkspaceId();
  const { data, error } = await selectPlaylists(workspaceId)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapPlaylistRow(data as PlaylistRow) : undefined;
}
