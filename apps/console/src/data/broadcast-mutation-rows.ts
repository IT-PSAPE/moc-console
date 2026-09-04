export type BroadcastMutationItem = {
  createdAt?: string
  durationSeconds: number | null
  fileSizeBytes: number
  id?: string
  mimeType: string
  publicUrl: string
  storageBucket: string
  storagePath: string
  title: string
}

export type BroadcastMutationRow = {
  created_at: string | null
  duration_seconds: number | null
  file_size_bytes: number
  id: string | null
  mime_type: string
  public_url: string
  sort_order: number
  storage_bucket: string
  storage_path: string
  title: string
}

export function buildBroadcastMutationRows(items: BroadcastMutationItem[]): BroadcastMutationRow[] {
  return items.map((item, index) => ({
    created_at: item.createdAt ?? null,
    duration_seconds: item.durationSeconds,
    file_size_bytes: item.fileSizeBytes,
    id: item.id ?? null,
    mime_type: item.mimeType,
    public_url: item.publicUrl,
    sort_order: index,
    storage_bucket: item.storageBucket,
    storage_path: item.storagePath,
    title: item.title,
  }))
}
