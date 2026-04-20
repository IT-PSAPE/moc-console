import type { Playlist } from "@/types/broadcast/broadcast";
import type { Cue } from "@/types/broadcast/cue";
import type { MediaItem } from "@/types/broadcast/media-item";
import { supabase } from "@/lib/supabase";
import { getCurrentWorkspaceId } from "./current-workspace";
import { fetchPlaylistById } from "./fetch-broadcast";

type MediaRow = {
  id: string;
  name: string;
  type: MediaItem["type"];
  url: string;
  thumbnail_url: string | null;
  created_at: string;
};

function mapMediaRow(row: MediaRow, fallbackDuration: number | null): MediaItem {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    url: row.url,
    thumbnail: row.thumbnail_url,
    duration: fallbackDuration,
    createdAt: row.created_at,
  };
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

export async function updatePlaylistCues(playlistId: string, cues: Cue[]): Promise<Cue[]> {
  const deleteResult = await supabase
    .from("queue")
    .delete()
    .eq("playlist_id", playlistId);

  if (deleteResult.error) {
    throw new Error(deleteResult.error.message);
  }

  if (cues.length === 0) {
    return [];
  }

  const { error } = await supabase
    .from("queue")
    .insert(cues.map((cue, index) => ({
      id: cue.id,
      playlist_id: playlistId,
      media_id: cue.mediaItemId,
      sort_order: index + 1,
      duration: cue.durationOverride,
      disabled: cue.disabled ?? false,
    })));

  if (error) {
    throw new Error(error.message);
  }

  return cues.map((cue, index) => ({ ...cue, order: index + 1 }));
}

// Uploads a file to the public `media` Supabase Storage bucket and returns
// the resulting public URL. Objects are keyed by workspace_id/<uuid>.<ext>
// so the originating workspace is recoverable from the path without leaking
// anything sensitive (workspace_id is already known to all members).
export async function uploadMediaFile(file: File): Promise<string> {
  const workspaceId = await getCurrentWorkspaceId();
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const path = `${workspaceId}/${crypto.randomUUID()}.${ext}`;

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
  };

  const { data, error } = await supabase
    .from("media")
    .insert(payload)
    .select("id, name, type, url, thumbnail_url, created_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapMediaRow(data as MediaRow, item.duration);
}

export async function deleteMediaItem(id: string): Promise<void> {
  const { error } = await supabase
    .from("media")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
