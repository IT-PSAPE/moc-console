import { supabase } from "@moc/data/supabase"
import type { Broadcast, BroadcastItem, BroadcastKind } from "@moc/types/broadcast/broadcast"

type BroadcastItemRow = {
  id: string
  broadcast_id: string
  title: string
  sort_order: number
  storage_bucket: string
  storage_path: string
  public_url: string
  mime_type: string
  file_size_bytes: number
  duration_seconds: number | null
  created_at: string
}

type BroadcastRow = {
  id: string
  workspace_id: string
  created_by: string
  title: string
  description: string
  slug: string
  kind: BroadcastKind
  created_at: string
  updated_at: string
  broadcast_items: BroadcastItemRow[] | null
}

const PUBLIC_BROADCAST_SELECT = `
  id,
  workspace_id,
  created_by,
  title,
  description,
  slug,
  kind,
  created_at,
  updated_at,
  broadcast_items (
    id,
    broadcast_id,
    title,
    sort_order,
    storage_bucket,
    storage_path,
    public_url,
    mime_type,
    file_size_bytes,
    duration_seconds,
    created_at
  )
`

function mapBroadcastItemRow(row: BroadcastItemRow): BroadcastItem {
  return {
    id: row.id,
    broadcastId: row.broadcast_id,
    title: row.title,
    sortOrder: row.sort_order,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    publicUrl: row.public_url,
    mimeType: row.mime_type,
    fileSizeBytes: row.file_size_bytes,
    durationSeconds: row.duration_seconds,
    createdAt: row.created_at,
  }
}

function mapBroadcastRow(row: BroadcastRow): Broadcast {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    createdBy: row.created_by,
    title: row.title,
    description: row.description,
    slug: row.slug,
    kind: row.kind,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: (row.broadcast_items ?? []).map(mapBroadcastItemRow).sort((left, right) => left.sortOrder - right.sortOrder),
  }
}

export async function fetchPublicBroadcast(slug: string): Promise<Broadcast | null> {
  const { data, error } = await supabase
    .from("broadcasts")
    .select(PUBLIC_BROADCAST_SELECT)
    .eq("slug", slug)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data ? mapBroadcastRow(data as BroadcastRow) : null
}

export async function fetchBroadcastById(id: string): Promise<Broadcast | null> {
  const { data, error } = await supabase
    .from("broadcasts")
    .select(PUBLIC_BROADCAST_SELECT)
    .eq("id", id)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data ? mapBroadcastRow(data as BroadcastRow) : null
}
