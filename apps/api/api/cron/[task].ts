import notificationDeliveries from "../../server/handlers/cron/notification-deliveries.js"
import staleItems from "../../server/handlers/cron/stale-items.js"
import streamSync from "../../server/handlers/cron/stream-sync.js"
import weeklyArchive from "../../server/handlers/cron/weekly-archive.js"
import { dispatchNamedRoute, type ApiHandler } from "../../server/route-dispatch.js"
import type { ApiRequest, ApiResponse } from "../../server/http.js"
import { observeApiRequest } from "../../server/observability.js"

const routes: Readonly<Record<string, ApiHandler>> = {
  "notification-deliveries": notificationDeliveries,
  "stale-items": staleItems,
  "stream-sync": streamSync,
  "weekly-archive": weeklyArchive,
}

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  await observeApiRequest("cron", request, response, async () => {
    await dispatchNamedRoute(request, response, "task", routes)
  })
}
