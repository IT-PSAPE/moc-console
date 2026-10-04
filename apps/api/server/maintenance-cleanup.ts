import { queryRows } from "@moc/backend/database"
import type { QueryResultRow } from "pg"

type CleanupRpcResult = QueryResultRow & {
  rate_limit_windows: unknown
  notification_ingest_replays: unknown
  telegram_webhook_updates: unknown
}

export type MaintenanceCleanupResult = {
  rateLimitWindows: number
  notificationIngestReplays: number
  telegramWebhookUpdates: number
}

export type MaintenanceCleanupStore = {
  purge: () => Promise<unknown>
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
}

function parseCleanupResult(data: unknown): MaintenanceCleanupResult {
  if (!Array.isArray(data) || data.length !== 1) {
    throw new Error("Maintenance cleanup returned an invalid result")
  }

  const result = data[0] as CleanupRpcResult
  if (
    typeof result !== "object" ||
    result === null ||
    !isNonNegativeInteger(result.rate_limit_windows) ||
    !isNonNegativeInteger(result.notification_ingest_replays) ||
    !isNonNegativeInteger(result.telegram_webhook_updates)
  ) {
    throw new Error("Maintenance cleanup returned an invalid result")
  }

  return {
    rateLimitWindows: result.rate_limit_windows,
    notificationIngestReplays: result.notification_ingest_replays,
    telegramWebhookUpdates: result.telegram_webhook_updates,
  }
}

function getPostgresMaintenanceCleanupStore(): MaintenanceCleanupStore {
  return {
    async purge(): Promise<unknown> {
      return queryRows<CleanupRpcResult>(
        `WITH rate_limits AS (
           DELETE FROM public.api_rate_limit_windows
           WHERE window_started_at < now() - interval '7 days'
           RETURNING 1
         ), ingest_replays AS (
           DELETE FROM public.notification_ingest_replays
           WHERE expires_at <= now()
           RETURNING 1
         ), webhook_updates AS (
           DELETE FROM public.telegram_webhook_updates
           WHERE status IN ('processed', 'failed')
             AND coalesce(processed_at, received_at) < now() - interval '30 days'
           RETURNING 1
         )
         SELECT
           (SELECT count(*)::integer FROM rate_limits) AS rate_limit_windows,
           (SELECT count(*)::integer FROM ingest_replays) AS notification_ingest_replays,
           (SELECT count(*)::integer FROM webhook_updates) AS telegram_webhook_updates`,
      )
    },
  }
}

export async function purgeApiMaintenanceData(
  store: MaintenanceCleanupStore = getPostgresMaintenanceCleanupStore(),
): Promise<MaintenanceCleanupResult> {
  return parseCleanupResult(await store.purge())
}
