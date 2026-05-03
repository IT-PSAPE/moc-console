import { supabase } from "@/lib/supabase"
import type { Cue, CueType, Track, TrackColorKey } from "@/types/cue-sheet"

export type EventShare = {
  id: string
  eventId: string
  shareToken: string
  isActive: boolean
  liveSyncEnabled: boolean
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

export type EventPlaybackState = {
  eventId: string
  currentTimeMin: number
  isPlaying: boolean
  playbackSpeed: number
  updatedAt: string | null
}

type EventShareRow = {
  id: string
  event_id: string
  share_token: string
  is_active: boolean
  live_sync_enabled: boolean
  expires_at: string | null
  created_at: string
  updated_at: string
}

function mapShareRow(row: EventShareRow): EventShare {
  return {
    id: row.id,
    eventId: row.event_id,
    shareToken: row.share_token,
    isActive: row.is_active,
    liveSyncEnabled: row.live_sync_enabled,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function generateShareToken(): string {
  // 22-char URL-safe random token (~128 bits of entropy)
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

export async function fetchEventShare(eventId: string): Promise<EventShare | null> {
  const { data, error } = await supabase
    .from("event_shares")
    .select("id, event_id, share_token, is_active, live_sync_enabled, expires_at, created_at, updated_at")
    .eq("event_id", eventId)
    .eq("is_active", true)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return mapShareRow(data as EventShareRow)
}

export async function createEventShare(eventId: string, opts: { liveSyncEnabled?: boolean } = {}): Promise<EventShare> {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from("event_shares")
    .insert({
      event_id: eventId,
      share_token: generateShareToken(),
      is_active: true,
      live_sync_enabled: opts.liveSyncEnabled ?? true,
      created_by: user?.id ?? null,
    })
    .select("id, event_id, share_token, is_active, live_sync_enabled, expires_at, created_at, updated_at")
    .single()

  if (error) throw new Error(error.message)
  return mapShareRow(data as EventShareRow)
}

export async function updateEventShare(
  shareId: string,
  fields: Partial<{ isActive: boolean; liveSyncEnabled: boolean; expiresAt: string | null }>,
): Promise<EventShare> {
  const update: Record<string, unknown> = {}
  if (fields.isActive !== undefined) update.is_active = fields.isActive
  if (fields.liveSyncEnabled !== undefined) update.live_sync_enabled = fields.liveSyncEnabled
  if (fields.expiresAt !== undefined) update.expires_at = fields.expiresAt

  const { data, error } = await supabase
    .from("event_shares")
    .update(update)
    .eq("id", shareId)
    .select("id, event_id, share_token, is_active, live_sync_enabled, expires_at, created_at, updated_at")
    .single()

  if (error) throw new Error(error.message)
  return mapShareRow(data as EventShareRow)
}

export async function revokeEventShare(shareId: string): Promise<void> {
  const { error } = await supabase
    .from("event_shares")
    .update({ is_active: false })
    .eq("id", shareId)

  if (error) throw new Error(error.message)
}

export async function upsertEventPlaybackState(
  eventId: string,
  fields: { currentTimeMin: number; isPlaying: boolean; playbackSpeed?: number },
): Promise<EventPlaybackState> {
  const { data, error } = await supabase.rpc("upsert_event_playback_state", {
    p_event_id: eventId,
    p_current_time_min: fields.currentTimeMin,
    p_is_playing: fields.isPlaying,
    p_playback_speed: fields.playbackSpeed ?? 1,
  })

  if (error) throw new Error(error.message)
  const row = data as {
    event_id: string
    current_time_min: number
    is_playing: boolean
    playback_speed: number
    updated_at: string
  }
  return {
    eventId: row.event_id,
    currentTimeMin: Number(row.current_time_min),
    isPlaying: row.is_playing,
    playbackSpeed: Number(row.playback_speed),
    updatedAt: row.updated_at,
  }
}

// ─── Public read via share token (anonymous-safe) ───────────────────

export type SharedEventView = {
  share: { token: string; liveSyncEnabled: boolean; expiresAt: string | null }
  event: {
    id: string
    title: string
    description: string
    duration: number
    scheduledAt: string | null
  }
  tracks: Track[]
  playback: EventPlaybackState
}

type SharedEventViewRpc = {
  share: { token: string; live_sync_enabled: boolean; expires_at: string | null }
  event: {
    id: string
    title: string
    description: string
    duration: number
    scheduled_at: string | null
  }
  tracks: Array<{
    id: string
    name: string
    sort_order: number
    color_key: string | null
    cues: Array<{
      id: string
      label: string
      start: number
      duration: number
      type: CueType
      assignee: string | null
      notes: string | null
    }>
  }>
  playback: {
    event_id: string
    current_time_min: number
    is_playing: boolean
    playback_speed: number
    updated_at: string | null
  }
}

export async function fetchSharedEventView(token: string): Promise<SharedEventView | null> {
  const { data, error } = await supabase.rpc("get_shared_event_view", { p_token: token })

  if (error) throw new Error(error.message)
  if (!data) return null

  const view = data as SharedEventViewRpc

  const tracks: Track[] = view.tracks
    .slice()
    .sort((left, right) => left.sort_order - right.sort_order)
    .map((track) => ({
      id: track.id,
      name: track.name,
      colorKey: ((track.color_key ?? "blue") as TrackColorKey),
      cues: (track.cues ?? [])
        .map<Cue>((cue) => ({
          id: cue.id,
          label: cue.label,
          startMin: Number(cue.start),
          durationMin: Number(cue.duration),
          type: cue.type,
          assignee: cue.assignee ?? undefined,
          notes: cue.notes ?? undefined,
        }))
        .sort((left, right) => left.startMin - right.startMin),
    }))

  return {
    share: {
      token: view.share.token,
      liveSyncEnabled: view.share.live_sync_enabled,
      expiresAt: view.share.expires_at,
    },
    event: {
      id: view.event.id,
      title: view.event.title,
      description: view.event.description ?? "",
      duration: Number(view.event.duration),
      scheduledAt: view.event.scheduled_at,
    },
    tracks,
    playback: {
      eventId: view.playback.event_id,
      currentTimeMin: Number(view.playback.current_time_min),
      isPlaying: view.playback.is_playing,
      playbackSpeed: Number(view.playback.playback_speed),
      updatedAt: view.playback.updated_at,
    },
  }
}
