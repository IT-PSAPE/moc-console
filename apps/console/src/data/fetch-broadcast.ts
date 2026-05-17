import type { MediaItem } from "@moc/types/broadcast/media-item";
import type { Playlist } from "@moc/types/broadcast/broadcast";
import type { Cue } from "@moc/types/broadcast/cue";
import type { LaneType } from "@moc/types/broadcast/lane";
import { groupCuesIntoLanes, flattenLanes } from "@moc/types/broadcast/lane";
import { supabase } from "@moc/data/supabase";
import { getCurrentWorkspaceId } from "./current-workspace";

const MEDIA_COLUMNS =
  "id, name, type, url, thumbnail_url, duration_seconds, width, height, created_at";

type MediaRow = {
  id: string;
  name: string;
  type: MediaItem["type"];
  url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
  created_at: string;
};

type QueueRow = {
  id: string;
  lane_id: string | null;
  sort_order: number;
  duration: number | null;
  start_sec: number | null;
  in_point: number | null;
  out_point: number | null;
  muted: boolean | null;
  disabled: boolean;
  media: MediaRow | MediaRow[] | null;
};

type LaneRow = {
  id: string;
  sort_order: number;
  type: string;
  name: string | null;
};

type PlaylistRow = {
  id: string;
  name: string;
  description: string;
  status: Playlist["status"];
  created_at: string;
  default_image_duration: number;
  thumbnail_url: string | null;
  playback_mode: Playlist["playbackMode"];
  next_playlist_id: string | null;
  transition: Playlist["transition"];
  transition_duration_ms: number;
  music: MediaRow | MediaRow[] | null;
  queue: QueueRow[] | null;
  playlist_lanes: LaneRow[] | null;
};

function mapMediaRow(row: MediaRow): MediaItem {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    url: row.url,
    thumbnail: row.thumbnail_url,
    duration: row.duration_seconds,
    width: row.width,
    height: row.height,
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
    laneId: row.lane_id ?? undefined,
    order: row.sort_order,
    durationOverride: row.duration,
    startSec: row.start_sec,
    inPoint: row.in_point ?? 0,
    outPoint: row.out_point,
    muted: row.muted ?? false,
    disabled: row.disabled,
  };
}

function mapPlaylistRow(row: PlaylistRow): Playlist {
  const music = Array.isArray(row.music) ? row.music[0] : row.music;
  const lanes = groupCuesIntoLanes(
    (row.queue ?? []).map(mapCueRow),
    (row.playlist_lanes ?? []).map((l) => ({
      id: l.id,
      order: l.sort_order,
      type: (l.type as LaneType) ?? "visual",
      name: l.name,
    })),
  );
  const cues = flattenLanes(lanes);

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    lanes,
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
    thumbnailUrl: row.thumbnail_url,
    playbackMode: row.playback_mode,
    nextPlaylistId: row.next_playlist_id,
    transition: row.transition,
    transitionDurationMs: row.transition_duration_ms,
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
      thumbnail_url,
      playback_mode,
      next_playlist_id,
      transition,
      transition_duration_ms,
      music:music_id(${MEDIA_COLUMNS}),
      queue(
        id,
        lane_id,
        sort_order,
        duration,
        start_sec,
        in_point,
        out_point,
        muted,
        disabled,
        media:media_id(${MEDIA_COLUMNS})
      ),
      playlist_lanes(id, sort_order, type, name)
    `)
    .eq("workspace_id", workspaceId);
}

export async function fetchMedia(): Promise<MediaItem[]> {
  const workspaceId = await getCurrentWorkspaceId();
  const { data, error } = await supabase
    .from("media")
    .select(MEDIA_COLUMNS)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as MediaRow[]).map(mapMediaRow);
}

export async function fetchMediaById(id: string): Promise<MediaItem | undefined> {
  const workspaceId = await getCurrentWorkspaceId();
  const { data, error } = await supabase
    .from("media")
    .select(MEDIA_COLUMNS)
    .eq("id", id)
    .eq("workspace_id", workspaceId)
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
