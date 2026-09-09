import { errorMessage } from "../observability.js"
import type { UsableConnections } from "./provider-connections.js"
import { classifySyncFailure, type SyncFailureReason } from "./sync-failure.js"
import {
  addProviderSyncResult,
  emptyProviderSyncSummary,
  type ProviderSyncResult,
  type ProviderSyncSummary,
  type SyncFailure,
  type SyncProvider,
} from "./sync-summary.js"

type DeferralReason = SyncFailureReason | "budget_spent"

/**
 * Workspaces the sweep never reached. Logged at error level with their ids
 * rather than as a count: deferral means the daily sync silently did not happen
 * for those workspaces, and a count in a response body nobody reads cannot show
 * that the same ones are being missed every day.
 */
function deferRemaining<Connection extends { workspaceId: string }>(
  provider: SyncProvider,
  summary: ProviderSyncSummary,
  remaining: Connection[],
  reason: DeferralReason,
): void {
  if (remaining.length === 0) return
  summary.deferred += remaining.length
  console.error(JSON.stringify({
    event: "cron.stream_sync.provider_deferred",
    provider,
    reason,
    workspaceIds: remaining.map((connection) => connection.workspaceId),
  }))
}

/**
 * One provider across every workspace that has it connected, one workspace at a
 * time. Sequential on purpose: fanning out across workspaces would trip provider
 * rate limits and buy nothing in a daily job.
 *
 * Each workspace is isolated — a throw is classified, recorded and the sweep
 * moves to the next one. A connection torn down or needing reconnect since the
 * gate ran is a quiet skip logged at info, never a failure. The exception is an
 * outcome that belongs to the provider rather than the workspace: the rest are
 * deferred instead of each repeating the same doomed request.
 */
export async function sweepProvider<Connection extends { workspaceId: string }>(
  provider: SyncProvider,
  usable: UsableConnections<Connection>,
  sync: (connection: Connection) => Promise<ProviderSyncResult>,
  deadline: number,
  now: () => number,
  failures: SyncFailure[],
): Promise<ProviderSyncSummary> {
  const summary = emptyProviderSyncSummary()
  summary.workspaces = usable.connections.length + usable.skipped.length + usable.failures.length
  summary.skipped = usable.skipped.length
  for (const gateFailure of usable.failures) {
    summary.failed += 1
    failures.push({ provider, reason: gateFailure.reason, workspaceId: gateFailure.workspaceId })
  }

  for (const [index, connection] of usable.connections.entries()) {
    const workspaceId = connection.workspaceId
    if (now() >= deadline) {
      deferRemaining(provider, summary, usable.connections.slice(index), "budget_spent")
      break
    }
    try {
      const result = await sync(connection)
      addProviderSyncResult(summary, result)
      summary.synced += 1
      console.info(JSON.stringify({ ...result, event: "cron.stream_sync.provider", provider, workspaceId }))
    } catch (error) {
      const outcome = classifySyncFailure(error)
      if (outcome.quiet) {
        summary.skipped += 1
        console.info(JSON.stringify({ event: "cron.stream_sync.provider_skipped", provider, reason: outcome.reason, workspaceId }))
        continue
      }
      summary.failed += 1
      failures.push({ provider, reason: outcome.reason, workspaceId })
      console.error(JSON.stringify({
        error: errorMessage(error),
        event: "cron.stream_sync.provider_failed",
        provider,
        reason: outcome.reason,
        workspaceId,
      }))
      if (outcome.terminalForProvider) {
        deferRemaining(provider, summary, usable.connections.slice(index + 1), outcome.reason)
        break
      }
    }
  }

  return summary
}
