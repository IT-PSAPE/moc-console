import notificationDeliveries from "../../server/handlers/cron/notification-deliveries.js"
import staleItems from "../../server/handlers/cron/stale-items.js"
import weeklyArchive from "../../server/handlers/cron/weekly-archive.js"
import { dispatchNamedRoute, type ApiHandler } from "../../server/route-dispatch.js"
import type { ApiRequest, ApiResponse } from "../../server/http.js"

const routes: Readonly<Record<string, ApiHandler>> = {
  "notification-deliveries": notificationDeliveries,
  "stale-items": staleItems,
  "weekly-archive": weeklyArchive,
}

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  await dispatchNamedRoute(request, response, "task", routes)
}
