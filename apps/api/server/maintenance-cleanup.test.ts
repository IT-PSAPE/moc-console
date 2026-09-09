import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { purgeApiMaintenanceData } from "./maintenance-cleanup.js"

describe("purgeApiMaintenanceData", () => {
  it("returns each durable store's deletion count", async () => {
    const result = await purgeApiMaintenanceData({
      async purge(): Promise<unknown> {
        return [{ rate_limit_windows: 3, notification_ingest_replays: 4, telegram_webhook_updates: 5 }]
      },
    })

    assert.deepEqual(result, {
      rateLimitWindows: 3,
      notificationIngestReplays: 4,
      telegramWebhookUpdates: 5,
    })
  })

  it("rejects an invalid database contract instead of reporting incomplete cleanup", async () => {
    await assert.rejects(
      purgeApiMaintenanceData({
        async purge(): Promise<unknown> {
          return [{ rate_limit_windows: 3, notification_ingest_replays: "4", telegram_webhook_updates: 5 }]
        },
      }),
      /invalid result/,
    )
  })
})
