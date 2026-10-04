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
  createdAt: string | null
  durationSeconds: number | null
  fileSizeBytes: number
  id: string | null
  mimeType: string
  publicUrl: string
  sortOrder: number
  storageBucket: string
  storagePath: string
  title: string
}

export function buildBroadcastMutationRows(items: BroadcastMutationItem[]): BroadcastMutationRow[] {
  return items.map((item, index) => ({
    createdAt: item.createdAt ?? null,
    durationSeconds: item.durationSeconds,
    fileSizeBytes: item.fileSizeBytes,
    id: item.id ?? null,
    mimeType: item.mimeType,
    publicUrl: item.publicUrl,
    sortOrder: index,
    storageBucket: item.storageBucket,
    storagePath: item.storagePath,
    title: item.title,
  }))
}
