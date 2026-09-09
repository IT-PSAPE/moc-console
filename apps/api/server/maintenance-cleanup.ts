import { getSupabaseAdmin } from "./supabase-admin.js"

type CleanupRpcResult = {
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
    throw new Error("Maintenance cleanup RPC returned an invalid result")
  }

  const result = data[0] as CleanupRpcResult
  if (
    typeof result !== "object" ||
    result === null ||
    !isNonNegativeInteger(result.rate_limit_windows) ||
    !isNonNegativeInteger(result.notification_ingest_replays) ||
    !isNonNegativeInteger(result.telegram_webhook_updates)
  ) {
    throw new Error("Maintenance cleanup RPC returned an invalid result")
  }

  return {
    rateLimitWindows: result.rate_limit_windows,
    notificationIngestReplays: result.notification_ingest_replays,
    telegramWebhookUpdates: result.telegram_webhook_updates,
  }
}

function getSupabaseMaintenanceCleanupStore(): MaintenanceCleanupStore {
  return {
    async purge(): Promise<unknown> {
      const { data, error } = await getSupabaseAdmin().rpc("purge_api_maintenance_data")
      if (error) throw new Error("Maintenance cleanup failed")
      return data
    },
  }
}

export async function purgeApiMaintenanceData(
  store: MaintenanceCleanupStore = getSupabaseMaintenanceCleanupStore(),
): Promise<MaintenanceCleanupResult> {
  return parseCleanupResult(await store.purge())
}
