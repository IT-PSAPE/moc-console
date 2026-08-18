import { errorMessage } from "../observability.js"
import type { ProviderSyncResult, SyncProvider } from "./sync-summary.js"

type AdoptedEntityRow = {
  id: string
  notified_at: string | null
}

/**
 * Announces the items a sweep newly adopted, one at a time.
 *
 * Only adopted items are passed in: announcing every row with a null
 * `notified_at` re-sent the entire backlog on each sync, and because the
 * per-user rate limit rejected most of that burst, `notified_at` stayed null and
 * the same items queued again on the next run. A row already stamped is skipped,
 * and one failed announcement is counted rather than allowed to abort the rest —
 * the outbox retries it on the delivery cron regardless.
 */
export async function announceAdoptedEntities<Row extends AdoptedEntityRow>(
  provider: SyncProvider,
  workspaceId: string,
  rows: Row[],
  announce: (row: Row) => Promise<void>,
  result: ProviderSyncResult,
): Promise<void> {
  for (const row of rows) {
    if (row.notified_at) continue
    try {
      await announce(row)
      result.announced += 1
    } catch (error) {
      result.announceFailed += 1
      console.error(JSON.stringify({
        entityId: row.id,
        error: errorMessage(error),
        event: "cron.stream_sync.announce_failed",
        provider,
        workspaceId,
      }))
    }
  }
}
