import type { SyncFailureReason } from "./sync-failure.js"

export type SyncProvider = "youtube" | "zoom"

/** What one workspace's sync of one provider changed. */
export type ProviderSyncResult = {
  adopted: number
  announced: number
  announceFailed: number
  deleted: number
  reconciled: number
}

export type ProviderSyncSummary = ProviderSyncResult & {
  deferred: number
  failed: number
  skipped: number
  synced: number
  workspaces: number
}

export type SyncFailure = {
  provider: SyncProvider
  /** Null when the provider's connection list itself could not be read. */
  workspaceId: string | null
  reason: SyncFailureReason | "enumeration_failed"
}

export function emptyProviderSyncResult(): ProviderSyncResult {
  return { adopted: 0, announced: 0, announceFailed: 0, deleted: 0, reconciled: 0 }
}

export function emptyProviderSyncSummary(): ProviderSyncSummary {
  return { ...emptyProviderSyncResult(), deferred: 0, failed: 0, skipped: 0, synced: 0, workspaces: 0 }
}

export function addProviderSyncResult(summary: ProviderSyncSummary, result: ProviderSyncResult): void {
  summary.adopted += result.adopted
  summary.announced += result.announced
  summary.announceFailed += result.announceFailed
  summary.deleted += result.deleted
  summary.reconciled += result.reconciled
}
