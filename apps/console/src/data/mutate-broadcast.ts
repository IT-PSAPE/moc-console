import type { Playlist } from "@moc/types/broadcast/broadcast";
import type { Cue } from "@moc/types/broadcast/cue";
import type { PlaylistLane } from "@moc/types/broadcast/lane";
import type { MediaItem } from "@moc/types/broadcast/media-item";
import { supabase } from "@moc/data/supabase";
import { getCurrentWorkspaceId } from "./current-workspace";
import { fetchPlaylistById } from "./fetch-broadcast";
import { randomId } from "@moc/utils/random-id";
import { probeMediaMetadata } from "@moc/utils/media-source";

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

function getManagedMediaStoragePath(url: string): string | null {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  if (!supabaseUrl) {
    return null;
  }

  const publicPrefix = `${supabaseUrl}/storage/v1/object/public/media/`;

  if (!url.startsWith(publicPrefix)) {
    return null;
  }

  return decodeURIComponent(url.slice(publicPrefix.length));
}

export async function updatePlaylist(playlist: Playlist): Promise<Playlist> {
  const workspaceId = await getCurrentWorkspaceId();
  const payload = {
    id: playlist.id,
    workspace_id: workspaceId,
    name: playlist.name,
    description: playlist.description,
    status: playlist.status,
    music_id: playlist.backgroundMusicId ?? null,
    default_image_duration: playlist.defaultImageDuration,
    thumbnail_url: playlist.thumbnailUrl,
    playback_mode: playlist.playbackMode,
    next_playlist_id: playlist.nextPlaylistId,
    transition: playlist.transition,
    transition_duration_ms: playlist.transitionDurationMs,
  };

  const { error } = await supabase
    .from("playlists")
    .upsert(payload, { onConflict: "id" });

  if (error) {
    throw new Error(error.message);
  }

  const savedPlaylist = await fetchPlaylistById(playlist.id);

  if (!savedPlaylist) {
    throw new Error("Saved playlist could not be reloaded");
  }

  return {
    ...savedPlaylist,
    cues: savedPlaylist.cues.length > 0 ? savedPlaylist.cues : playlist.cues,
    videoSettings: playlist.videoSettings,
  };
}

export async function deletePlaylist(id: string): Promise<void> {
  const { error } = await supabase
    .from("playlists")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

function laneToPayload(lane: PlaylistLane, index: number) {
  return {
    id: lane.id,
    sort_order: index,
    type: lane.type,
    name: lane.name,
    cues: lane.cues.map((cue, cueIndex) => ({
      id: cue.id,
      media_id: cue.mediaItemId,
      sort_order: cueIndex + 1,
      duration: cue.durationOverride,
      start_sec: cue.startSec ?? null,
      in_point: cue.inPoint ?? 0,
      out_point: cue.outPoint ?? null,
      muted: cue.muted ?? false,
      disabled: cue.disabled ?? false,
    })),
  };
}

// Full multi-lane save (ADR-0004). Replaces the playlist's lanes + queue.
export async function updatePlaylistLanes(playlistId: string, lanes: PlaylistLane[]): Promise<PlaylistLane[]> {
  const { error } = await supabase.rpc("save_playlist_lanes", {
    p_playlist_id: playlistId,
    p_lanes: lanes.map(laneToPayload),
  });

  if (error) {
    throw new Error(error.message);
  }

  return lanes.map((lane, index) => ({
    ...lane,
    order: index,
    cues: lane.cues.map((cue, cueIndex) => ({ ...cue, laneId: lane.id, order: cueIndex + 1 })),
  }));
}

// Back-compat single-lane save for the flat-cue editor. Wraps the cues
// into one default visual lane (post-phase-30 queue.lane_id is NOT NULL,
// so the old save_playlist_queue path no longer applies).
export async function updatePlaylistCues(playlistId: string, cues: Cue[]): Promise<Cue[]> {
  const laneId = randomId();
  const lane: PlaylistLane = { id: laneId, order: 0, type: "visual", name: null, cues };
  const { error } = await supabase.rpc("save_playlist_lanes", {
    p_playlist_id: playlistId,
    p_lanes: [laneToPayload(lane, 0)],
  });

  if (error) {
    throw new Error(error.message);
  }

  return cues.map((cue, index) => ({ ...cue, laneId, order: index + 1 }));
}

// Uploads a file to the public `media` Supabase Storage bucket and returns
// the resulting public URL. Objects are keyed by workspace_id/<uuid>.<ext>
// so the originating workspace is recoverable from the path without leaking
// anything sensitive (workspace_id is already known to all members).
export async function uploadMediaFile(file: File): Promise<string> {
  const workspaceId = await getCurrentWorkspaceId();
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const path = `${workspaceId}/${randomId()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("media")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from("media").getPublicUrl(path);
  return data.publicUrl;
}

// Uploads a playlist cover image to the same public `media` bucket as
// media files, namespaced under <workspace_id>/playlist-thumbnails/.
// Returns the public URL to store in playlists.thumbnail_url.
export async function uploadPlaylistThumbnail(file: File): Promise<string> {
  const workspaceId = await getCurrentWorkspaceId();
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const path = `${workspaceId}/playlist-thumbnails/${randomId()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("media")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from("media").getPublicUrl(path);
  return data.publicUrl;
}

export async function createMediaItem(item: MediaItem): Promise<MediaItem> {
  const workspaceId = await getCurrentWorkspaceId();
  const payload = {
    id: item.id,
    workspace_id: workspaceId,
    name: item.name,
    type: item.type,
    url: item.url,
    thumbnail_url: item.thumbnail,
    duration_seconds: item.duration,
    width: item.width,
    height: item.height,
  };

  const { data, error } = await supabase
    .from("media")
    .insert(payload)
    .select(MEDIA_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapMediaRow(data as MediaRow);
}

// Persists probed intrinsic metadata onto an existing media row. Used by
// the lazy backfill for assets uploaded before duration capture existed.
export async function updateMediaMetadata(
  id: string,
  meta: { duration: number | null; width: number | null; height: number | null },
): Promise<void> {
  const { error } = await supabase
    .from("media")
    .update({
      duration_seconds: meta.duration,
      width: meta.width,
      height: meta.height,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

// One-time, self-healing backfill: any non-image asset missing a duration
// (uploaded before capture existed) gets probed from its URL and patched.
// Returns the items with freshly probed values merged in; failures are
// left untouched and simply retried on a later load.
export async function backfillMediaDurations(items: MediaItem[]): Promise<MediaItem[]> {
  const stale = items.filter((m) => m.type !== "image" && m.duration == null);
  if (stale.length === 0) return items;

  const patched = new Map<string, MediaItem>();
  await Promise.all(
    stale.map(async (item) => {
      try {
        const meta = await probeMediaMetadata({ url: item.url }, item.type);
        if (meta.duration == null) return;
        await updateMediaMetadata(item.id, meta);
        patched.set(item.id, { ...item, ...meta });
      } catch {
        // Leave it; the next load will retry.
      }
    }),
  );

  if (patched.size === 0) return items;
  return items.map((m) => patched.get(m.id) ?? m);
}

export async function deleteMediaItem(item: Pick<MediaItem, "id" | "url">): Promise<void> {
  const storagePath = getManagedMediaStoragePath(item.url);

  if (storagePath) {
    const { error: storageError } = await supabase.storage
      .from("media")
      .remove([storagePath]);

    if (storageError) {
      throw new Error(storageError.message);
    }
  }

  const { error } = await supabase
    .from("media")
    .delete()
    .eq("id", item.id);

  if (error) {
    throw new Error(error.message);
  }
}
